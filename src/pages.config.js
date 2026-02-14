/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AbrirServicoART from './pages/AbrirServicoART';
import AnaliseCertidoes from './pages/AnaliseCertidoes';
import AreasFinanciaveis from './pages/AreasFinanciaveis';
import AtualizacaoDocumentos from './pages/AtualizacaoDocumentos';
import CadastroClientes from './pages/CadastroClientes';
import CadastroImoveis from './pages/CadastroImoveis';
import Checklist from './pages/Checklist';
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
import CroquiBradesco from './pages/CroquiBradesco';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AbrirServicoART": AbrirServicoART,
    "AnaliseCertidoes": AnaliseCertidoes,
    "AreasFinanciaveis": AreasFinanciaveis,
    "AtualizacaoDocumentos": AtualizacaoDocumentos,
    "CadastroClientes": CadastroClientes,
    "CadastroImoveis": CadastroImoveis,
    "Checklist": Checklist,
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
    "CroquiBradesco": CroquiBradesco,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};