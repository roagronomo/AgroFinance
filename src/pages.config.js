import AbrirServicoART from './pages/AbrirServicoART';
import AnaliseCertidoes from './pages/AnaliseCertidoes';
import AreasFinanciaveis from './pages/AreasFinanciaveis';
import CadastroClientes from './pages/CadastroClientes';
import CadastroImoveis from './pages/CadastroImoveis';
import Dashboard from './pages/Dashboard';
import EditarProjeto from './pages/EditarProjeto';
import EditarServicoART from './pages/EditarServicoART';
import ElaboracaoARTs from './pages/ElaboracaoARTs';
import GerenciamentoARTs from './pages/GerenciamentoARTs';
import Home from './pages/Home';
import NovoProjeto from './pages/NovoProjeto';
import ProducaoAgricola from './pages/ProducaoAgricola';
import TodosProjetos from './pages/TodosProjetos';
import Vencimentos from './pages/Vencimentos';
import CorrecaoVinculos from './pages/CorrecaoVinculos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AbrirServicoART": AbrirServicoART,
    "AnaliseCertidoes": AnaliseCertidoes,
    "AreasFinanciaveis": AreasFinanciaveis,
    "CadastroClientes": CadastroClientes,
    "CadastroImoveis": CadastroImoveis,
    "Dashboard": Dashboard,
    "EditarProjeto": EditarProjeto,
    "EditarServicoART": EditarServicoART,
    "ElaboracaoARTs": ElaboracaoARTs,
    "GerenciamentoARTs": GerenciamentoARTs,
    "Home": Home,
    "NovoProjeto": NovoProjeto,
    "ProducaoAgricola": ProducaoAgricola,
    "TodosProjetos": TodosProjetos,
    "Vencimentos": Vencimentos,
    "CorrecaoVinculos": CorrecaoVinculos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};