import Dashboard from './pages/Dashboard';
import NovoProjeto from './pages/NovoProjeto';
import TodosProjetos from './pages/TodosProjetos';
import EditarProjeto from './pages/EditarProjeto';
import Vencimentos from './pages/Vencimentos';
import GerenciamentoARTs from './pages/GerenciamentoARTs';
import AbrirServicoART from './pages/AbrirServicoART';
import EditarServicoART from './pages/EditarServicoART';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "NovoProjeto": NovoProjeto,
    "TodosProjetos": TodosProjetos,
    "EditarProjeto": EditarProjeto,
    "Vencimentos": Vencimentos,
    "GerenciamentoARTs": GerenciamentoARTs,
    "AbrirServicoART": AbrirServicoART,
    "EditarServicoART": EditarServicoART,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};