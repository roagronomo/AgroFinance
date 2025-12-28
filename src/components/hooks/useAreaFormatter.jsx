import { useEffect } from 'react';

/**
 * Hook para formatar automaticamente campos de área (ha) em pt-BR
 * Detecta campos dinamicamente, incluindo os da "caixa azul" (Áreas por Tipo de Uso)
 * Aplica formatação ao blur/change com 2 casas decimais
 */
export function useAreaFormatter() {
  useEffect(() => {
    const fmtBR = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    /** Procura o <label for=...> do input */
    const getLabelFor = (inp) =>
      inp.id ? document.querySelector(`label[for="${CSS.escape(inp.id)}"]`) : null;

    /** Normaliza texto livre (.,) -> Number (ponto decimal) */
    const toNumber = (raw) => {
      if (raw == null) return null;
      let v = String(raw).trim();
      if (!v) return null;

      // remove tudo que não é dígito, vírgula, ponto ou sinal
      v = v.replace(/[^\d.,-]/g, '');

      // última vírgula/ponto é decimal; demais viram milhares e são removidos
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      const decPos = Math.max(lastComma, lastDot);

      if (decPos !== -1) {
        const intPart = v.slice(0, decPos).replace(/[.,]/g, '');
        const fracPart = v.slice(decPos + 1).replace(/[.,]/g, '');
        v = intPart + '.' + fracPart;
      } else {
        v = v.replace(/[.,]/g, '');
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    /** Aplica máscara de 2 casas e milhares pt-BR */
    const formatBR = (num) =>
      num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    /** Dispara evento de input/change p/ frameworks (React) perceberem */
    const fireInput = (el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    /** Decide se o input é "de área (ha)" pelo label/placeholder/aria */
    const isHaInput = (inp) => {
      const hasHa = (t) => /\(ha\)/i.test(t || '');
      if (inp.closest('[data-ha-formatter-ignore]')) return false;

      // 1) label associado
      const lab = getLabelFor(inp);
      if (lab && hasHa(lab.textContent)) return true;

      // 2) label anterior imediato
      const prev = inp.previousElementSibling;
      if (prev && hasHa(prev.textContent)) return true;

      // 3) placeholder / aria-label
      const ph = (inp.getAttribute('placeholder') || '').toLowerCase();
      const ar = (inp.getAttribute('aria-label') || '').toLowerCase();
      if (ph.includes('(ha') || ar.includes('(ha')) return true;

      // 4) títulos dentro do "cartão azul" (fallback por data-field)
      const aria = (inp.getAttribute('aria-describedby') || '').toLowerCase();
      if (aria.includes('lavoura') || aria.includes('pastagem')) return true;

      // 5) busca por rótulo no container pai (para caixa azul)
      let probe = inp.parentElement;
      for (let i = 0; i < 3 && probe; i++) {
        const labels = probe.querySelectorAll('label, .text-blue-700, .font-medium');
        for (const el of labels) {
          if (hasHa(el.textContent)) return true;
        }
        probe = probe.parentElement;
      }

      return false;
    };

    /** Aplica comportamento ao input */
    const wire = (inp) => {
      if (inp.__haWired) return;
      inp.__haWired = true;

      // se for number, troca para text para aceitar vírgula e milhares
      if (inp.type === 'number') {
        try {
          inp.type = 'text';
        } catch (e) {
          console.warn('Não foi possível converter input para text:', e);
        }
      }
      inp.setAttribute('inputmode', 'decimal');
      inp.setAttribute('autocomplete', 'off');

      // durante digitação: manter apenas dígitos, . e ,
      const inputHandler = (e) => {
        const before = inp.value;
        const pos = inp.selectionStart;
        inp.value = before.replace(/[^\d.,-]/g, '');
        // tenta preservar o cursor
        if (typeof pos === 'number') {
          const diff = before.length - inp.value.length;
          const newPos = Math.max(0, pos - diff);
          requestAnimationFrame(() => {
            try {
              inp.setSelectionRange(newPos, newPos);
            } catch (e) {
              // Ignorar erro se o input não suportar selectionRange
            }
          });
        }
      };

      // ao sair do campo → formata BR (2 casas)
      const formatHandler = () => {
        const n = toNumber(inp.value);
        if (n === null) return;
        const formatted = formatBR(n);
        if (inp.value !== formatted) {
          inp.value = formatted;
          fireInput(inp);
        }
      };

      // se o app re-renderizar e perder type="text", forçamos novamente
      const attrObs = new MutationObserver(() => {
        if (isHaInput(inp) && inp.type === 'number') {
          try {
            inp.type = 'text';
          } catch (e) {
            // Ignorar erro
          }
        }
      });
      attrObs.observe(inp, { attributes: true, attributeFilter: ['type', 'value'] });

      inp.addEventListener('input', inputHandler, { capture: true });
      inp.addEventListener('blur', formatHandler, { capture: true });
      inp.addEventListener('change', formatHandler, { capture: true });

      // Cleanup
      inp.__haCleanup = () => {
        attrObs.disconnect();
        inp.removeEventListener('input', inputHandler, { capture: true });
        inp.removeEventListener('blur', formatHandler, { capture: true });
        inp.removeEventListener('change', formatHandler, { capture: true });
      };
    };

    /** Varre a página e conecta */
    const scan = (root = document) => {
      const inputs = [...root.querySelectorAll('input')];
      inputs.forEach((inp) => {
        if (isHaInput(inp)) wire(inp);
      });
    };

    // 1) agora
    scan();

    // 2) futuros (caixa azul é dinâmica)
    const mo = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes && m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) scan(n);
        });
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    console.log('✅ Formatação pós-digitação (pt-BR / 2 casas) aplicada aos campos (ha), incluindo a "caixa azul".');

    // Cleanup
    return () => {
      mo.disconnect();
      // Limpar todos os inputs que foram wired
      const allInputs = document.querySelectorAll('input');
      allInputs.forEach(inp => {
        if (inp.__haCleanup) {
          inp.__haCleanup();
          delete inp.__haCleanup;
          delete inp.__haWired;
        }
      });
    };
  }, []);
}