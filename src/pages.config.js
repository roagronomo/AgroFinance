// Páginas do AgroFinance (Financiamentos)
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

// Páginas do Cerrado Consultoria (Cadastro)
import CadastroClientes from './pages/CadastroClientes';
import CadastroImoveis from './pages/CadastroImoveis';
import ProducaoAgricola from './pages/ProducaoAgricola';
import AreasFinanciaveis from './pages/AreasFinanciaveis';
import AnaliseCertidoes from './pages/AnaliseCertidoes';

import __Layout from './Layout.jsx';

export const PAGES = {
  // Páginas de Financiamentos
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
  
  // Páginas de Cadastro
  "CadastroClientes": CadastroClientes,
  "CadastroImoveis": CadastroImoveis,
  "ProducaoAgricola": ProducaoAgricola,
  "AreasFinanciaveis": AreasFinanciaveis,
  "AnaliseCertidoes": AnaliseCertidoes,
}

export const pagesConfig = {
  mainPage: "Dashboard",
  Pages: PAGES,
  Layout: __Layout,
};
