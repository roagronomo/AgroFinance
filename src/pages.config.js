import AbrirServicoART from './pages/AbrirServicoART';
import Dashboard from './pages/Dashboard';
import EditarProjeto from './pages/EditarProjeto';
import EditarServicoART from './pages/EditarServicoART';
import ElaboracaoARTs from './pages/ElaboracaoARTs';
import GerenciamentoARTs from './pages/GerenciamentoARTs';
import Home from './pages/Home';
import NovoProjeto from './pages/NovoProjeto';
import TodosProjetos from './pages/TodosProjetos';
import Vencimentos from './pages/Vencimentos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AbrirServicoART": AbrirServicoART,
    "Dashboard": Dashboard,
    "EditarProjeto": EditarProjeto,
    "EditarServicoART": EditarServicoART,
    "ElaboracaoARTs": ElaboracaoARTs,
    "GerenciamentoARTs": GerenciamentoARTs,
    "Home": Home,
    "NovoProjeto": NovoProjeto,
    "TodosProjetos": TodosProjetos,
    "Vencimentos": Vencimentos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};