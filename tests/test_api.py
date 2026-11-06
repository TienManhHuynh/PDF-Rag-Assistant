"""API contract tests. AI and vector operations are isolated from external services."""
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from src.api.api_server import app
from src.api import history_store
from src.api.routers import documents, history, workspaces


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.directory = tempfile.TemporaryDirectory()
        self.storage = patch.object(history_store, 'HISTORY_ROOT', Path(self.directory.name))
        self.storage.start()

    def tearDown(self):
        self.storage.stop()
        self.directory.cleanup()

    def test_frontend_and_modules_are_served(self):
        page = self.client.get('/')
        self.assertEqual(page.status_code, 200)
        self.assertIn('type="module"', page.text)
        for path in ['/assets/js/app.js', '/assets/js/chat.js', '/assets/css/base.css', '/assets/css/responsive.css']:
            self.assertEqual(self.client.get(path).status_code, 200, path)
        self.assertEqual(self.client.get('/health').json()['status'], 'ok')

    def test_existing_api_paths_remain_available(self):
        paths = app.openapi()['paths']
        expected = {
            '/auth/login', '/auth/callback', '/auth/logout', '/auth/me',
            '/api/history/sessions', '/api/history/sessions/{session_id}',
            '/api/workspaces', '/api/workspaces/{workspace_name}',
            '/api/workspaces/{workspace_name}/files', '/api/upload',
            '/api/chat', '/api/chat/web', '/api/summarize', '/api/explain', '/health',
        }
        self.assertEqual(set(paths), expected)
        self.assertEqual(set(paths['/api/history/sessions/{session_id}']), {'get', 'put', 'delete'})

    def test_guest_history_is_read_only(self):
        self.assertEqual(self.client.get('/api/history/sessions').json(), [])
        response = self.client.post('/api/history/sessions', json={'workspace_name': 'study'})
        self.assertEqual(response.status_code, 401)

    def test_history_round_trip_preserves_web_metadata_and_user_isolation(self):
        with patch.object(history, '_current_user', return_value={'sub': 'user-a'}):
            response = self.client.post('/api/history/sessions', json={'workspace_name': 'study'})
            self.assertEqual(response.status_code, 201)
            session_id = response.json()['session_id']
            path = f'/api/history/sessions/{session_id}'
            messages = [{'role': 'assistant', 'content': 'Answer', 'web_results': [{'url': 'https://example.com'}], 'is_web': True}]
            self.assertEqual(self.client.put(path, json={'session_id': session_id, 'messages': messages}).status_code, 200)
            saved = self.client.get(path).json()['messages'][0]
            self.assertTrue(saved['is_web'])
            self.assertEqual(saved['web_results'], messages[0]['web_results'])
        with patch.object(history, '_current_user', return_value={'sub': 'user-b'}):
            self.assertEqual(self.client.get(path).status_code, 404)
        with patch.object(history, '_current_user', return_value={'sub': 'user-a'}):
            self.assertEqual(self.client.delete(path).status_code, 204)
            self.assertEqual(self.client.get(path).status_code, 404)

    def test_history_rejects_path_segments(self):
        from fastapi import HTTPException
        for value in ['..', '../outside', 'a\\b', 'C:outside']:
            with self.subTest(value=value), self.assertRaises(HTTPException):
                history_store.session_path('user', value)

    def test_missing_summary_document_returns_404(self):
        with patch.object(documents, 'get_full_text_by_file', return_value=''):
            response = self.client.post('/api/summarize', json={'workspace_name': 'study', 'file_name': 'missing.pdf'})
        self.assertEqual(response.status_code, 404)

    def test_summary_preserves_exact_filename(self):
        model = types.ModuleType('src.models.llm_generator')
        model.summarize_doc = lambda text: {'summary': f'Summary: {text}', 'model': 'test'}
        package = types.ModuleType('src.models')
        package.__path__ = []
        with patch.dict(sys.modules, {'src.models': package, 'src.models.llm_generator': model}), \
                patch.object(documents, 'get_full_text_by_file', return_value='Document text') as get_text:
            response = self.client.post('/api/summarize', json={'workspace_name': 'study', 'file_name': "lesson's.pdf"})
        self.assertEqual(response.status_code, 200)
        get_text.assert_called_once_with("lesson's.pdf", 'study')

    def test_workspace_contract(self):
        with patch.object(workspaces, 'list_workspaces', return_value=['study']), \
                patch.object(workspaces, 'list_files_in_workspace', return_value=['lesson.pdf']):
            self.assertEqual(self.client.get('/api/workspaces').json(), [{'name': 'study', 'file_count': 1}])


if __name__ == '__main__':
    unittest.main()
