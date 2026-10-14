import { mountLocalApp } from './bootstrap';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Container root não encontrado');

void mountLocalApp(container).catch((error: unknown) => {
  container.textContent = 'Não foi possível iniciar o ambiente local.';
  console.error(error);
});
