import './debug-directory.css';
import { buildDebugDirectoryMarkup } from './debug-directory.ts';

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  root.innerHTML = buildDebugDirectoryMarkup();
}
