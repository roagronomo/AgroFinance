import AbrirServicoART from './pages/AbrirServicoART';
import AnaliseCertidoes from './pages/AnaliseCertidoes';
import AreasFinanciaveis from './pages/AreasFinanciaveis';
import AtualizacaoDocumentos from './pages/AtualizacaoDocumentos';
import CadastroClientes from './pages/CadastroClientes';
import CadastroImoveis from './pages/CadastroImoveis';
import CorrecaoVinculos from './pages/CorrecaoVinculos';
import Dashboard from './pages/Dashboard';
import DespesasLembretes from './pages/DespesasLembretes';
import EditarProjeto from './pages/EditarProjeto';
import EditarServicoART from './pages/EditarServicoART';
import ElaboracaoARTs from './pages/ElaboracaoARTs';
import GerenciamentoARTs from './pages/GerenciamentoARTs';
import Home from './pages/Home';
import NovoProjeto from './pages/NovoProjeto';
import OutrosServicos from './pages/OutrosServicos';
import ProducaoAgricola from './pages/ProducaoAgricola';
import TodosProjetos from './pages/TodosProjetos';
import Vencimentos from './pages/Vencimentos';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AbrirServicoART": AbrirServicoART,
    "AnaliseCertidoes": AnaliseCertidoes,
    "AreasFinanciaveis": AreasFinanciaveis,
    "AtualizacaoDocumentos": AtualizacaoDocumentos,
    "CadastroClientes": CadastroClientes,
    "CadastroImoveis": CadastroImoveis,
    "CorrecaoVinculos": CorrecaoVinculos,
    "Dashboard": Dashboard,
    "DespesasLembretes": DespesasLembretes,
    "EditarProjeto": EditarProjeto,
    "EditarServicoART": EditarServicoART,
    "ElaboracaoARTs": ElaboracaoARTs,
    "GerenciamentoARTs": GerenciamentoARTs,
    "Home": Home,
    "NovoProjeto": NovoProjeto,
    "OutrosServicos": OutrosServicos,
    "ProducaoAgricola": ProducaoAgricola,
    "TodosProjetos": TodosProjetos,
    "Vencimentos": Vencimentos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};