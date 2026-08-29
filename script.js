(function(){
  "use strict";

  var STORAGE_KEY = "lista-compras-v1";
  var items = [];
  var nextId = 1;
  var pendingRemoval = null; // { item, index, timeoutId }

  var MERCADOS = {
    walmart:  { nome: "Walmart",    sigla: "WM", cor: "#0071ce" },
    winco:    { nome: "Winco",      sigla: "WC", cor: "#b3400c" },
    costco:   { nome: "Costco",     sigla: "CO", cor: "#d0021b" },
    samsclub: { nome: "Sam's Club", sigla: "SC", cor: "#001f4d" }
  };
  var ORDEM_MERCADOS = ["walmart", "winco", "costco", "samsclub"];
  var mercadoSelecionado = "walmart";

  // ---------- Persistência ----------
  function salvar(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items, nextId: nextId }));
    }catch(e){
      console.warn("Não foi possível salvar a lista:", e);
    }
  }

  function carregar(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      var data = JSON.parse(raw);
      if(data && Array.isArray(data.items)){
        items = data.items.map(function(it){
          return {
            id: it.id,
            nome: String(it.nome || ""),
            qtd: (Number.isFinite(it.qtd) && it.qtd > 0) ? it.qtd : 1,
            preco: (typeof it.preco === "number" && isFinite(it.preco)) ? it.preco : null,
            pego: !!it.pego,
            mercado: MERCADOS.hasOwnProperty(it.mercado) ? it.mercado : "walmart"
          };
        });
        nextId = Number.isFinite(data.nextId) ? data.nextId : (items.reduce(function(m,i){return Math.max(m, i.id||0);},0) + 1);
      }
    }catch(e){
      console.warn("Não foi possível carregar a lista salva:", e);
      items = [];
    }
  }

  // ---------- Parsing / formatação ----------
  function parsePreco(str){
    if(str == null) return null;
    var s = String(str).trim();
    if(s === "") return null;
    if(s.indexOf(",") !== -1 && s.indexOf(".") !== -1){
      s = s.replace(/,/g, "");
    } else if(s.indexOf(",") !== -1){
      s = s.replace(",", ".");
    }
    var val = parseFloat(s);
    if(!isFinite(val) || val < 0) return null;
    return Math.round(val * 100) / 100;
  }

  function parseQtd(str){
    var n = parseInt(String(str).replace(/[^\d]/g, ""), 10);
    if(!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, 999);
  }

  function formatCents(cents){
    var sign = cents < 0 ? "-" : "";
    var abs = Math.abs(Math.round(cents));
    var intPart = Math.floor(abs / 100);
    var decPart = String(abs % 100).padStart(2, "0");
    var intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + intStr + "." + decPart;
  }

  function itemSubtotalCents(item){
    var precoCents = item.preco != null ? Math.round(item.preco * 100) : 0;
    return precoCents * item.qtd;
  }

  function totalCents(){
    return items.reduce(function(sum, it){
      return it.pego ? sum + itemSubtotalCents(it) : sum;
    }, 0);
  }

  // ---------- Render ----------
  var listEl = document.getElementById("list");
  var emptyStateEl = document.getElementById("empty-state");
  var totalValueEl = document.getElementById("total-value");
  var progressTextEl = document.getElementById("progress-text");
  var progressFillEl = document.getElementById("progress-fill");

  function render(){
    // total
    totalValueEl.textContent = formatCents(totalCents());

    // progresso
    var total = items.length;
    var pegos = items.filter(function(i){ return i.pego; }).length;
    if(total === 0){
      progressTextEl.textContent = "0 itens na lista";
      progressFillEl.style.width = "0%";
    } else {
      progressTextEl.textContent = total + (total === 1 ? " item na lista" : " itens na lista") +
        " · " + pegos + (pegos === 1 ? " no carrinho" : " no carrinho");
      progressFillEl.style.width = Math.round((pegos/total)*100) + "%";
    }

    // lista
    if(items.length === 0){
      emptyStateEl.style.display = "flex";
      listEl.innerHTML = "";
      return;
    }
    emptyStateEl.style.display = "none";

    listEl.innerHTML = items.map(function(item){
      var precoTxt = item.preco != null
        ? formatCents(Math.round(item.preco*100))
        : "<span class=\"sem-preco\">sem preço</span>";
      var subtotalTxt = formatCents(itemSubtotalCents(item));
      var detailTxt = item.qtd > 1
        ? (item.qtd + "x " + precoTxt)
        : precoTxt;
      var m = MERCADOS[item.mercado] || MERCADOS.walmart;
      var badgeHtml = '<div class="mercado-badge" style="background:' + m.cor + '" title="' + m.nome + '">' + m.sigla + '</div>';
      return (
        '<div class="item ' + (item.pego ? "pego" : "") + '" data-id="' + item.id + '">' +
          '<button class="check" data-action="toggle" aria-label="Marcar como pego">✓</button>' +
          badgeHtml +
          '<div class="item-main" data-action="toggle">' +
            '<div class="item-name">' + escapeHtml(item.nome) + '</div>' +
            '<div class="item-detail">' + detailTxt + '</div>' +
          '</div>' +
          '<div class="item-subtotal mono">' + subtotalTxt + '</div>' +
          '<div class="item-actions">' +
            '<button class="edit-btn" data-action="edit" aria-label="Editar item">✎</button>' +
            '<button class="del-btn" data-action="remove" aria-label="Remover item">✕</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function escapeHtml(str){
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Ações ----------
  function adicionarItem(nome, qtdStr, precoStr){
    nome = nome.trim();
    if(!nome) return false;
    var item = {
      id: nextId++,
      nome: nome,
      qtd: parseQtd(qtdStr),
      preco: parsePreco(precoStr),
      pego: false,
      mercado: mercadoSelecionado
    };
    items.push(item);
    salvar();
    render();
    return true;
  }

  function toggleItem(id){
    var item = items.find(function(i){ return i.id === id; });
    if(!item) return;
    item.pego = !item.pego;
    salvar();
    render();
  }

  function removerItem(id){
    var index = items.findIndex(function(i){ return i.id === id; });
    if(index === -1) return;

    // se já existe uma remoção pendente, finaliza ela antes
    if(pendingRemoval){
      clearTimeout(pendingRemoval.timeoutId);
      pendingRemoval = null;
    }

    var removedItem = items[index];
    items.splice(index, 1);
    salvar();
    render();

    pendingRemoval = {
      item: removedItem,
      index: index,
      timeoutId: setTimeout(function(){
        pendingRemoval = null;
        esconderToast();
      }, 5000)
    };
    mostrarToast(removedItem.nome);
  }

  function desfazerRemocao(){
    if(!pendingRemoval) return;
    clearTimeout(pendingRemoval.timeoutId);
    var idx = Math.min(pendingRemoval.index, items.length);
    items.splice(idx, 0, pendingRemoval.item);
    pendingRemoval = null;
    salvar();
    render();
    esconderToast();
  }

  function limparTudo(){
    items = [];
    if(pendingRemoval){
      clearTimeout(pendingRemoval.timeoutId);
      pendingRemoval = null;
      esconderToast();
    }
    salvar();
    render();
  }

  // ---------- Toast ----------
  var toastEl = document.getElementById("toast");
  var toastTextEl = document.getElementById("toast-text");

  function mostrarToast(nome){
    toastTextEl.textContent = 'Removeu "' + nome + '"';
    toastEl.classList.add("show");
  }
  function esconderToast(){
    toastEl.classList.remove("show");
  }

  // ---------- Eventos ----------
  document.getElementById("list").addEventListener("click", function(e){
    var actionEl = e.target.closest("[data-action]");
    if(!actionEl) return;
    var itemEl = e.target.closest(".item");
    if(!itemEl) return;
    var id = Number(itemEl.getAttribute("data-id"));
    var action = actionEl.getAttribute("data-action");
    if(action === "toggle") toggleItem(id);
    if(action === "remove") removerItem(id);
    if(action === "edit") abrirEdicao(id);
  });

  document.getElementById("btn-undo").addEventListener("click", desfazerRemocao);

  var inputNome = document.getElementById("input-nome");
  var inputQtd = document.getElementById("input-qtd");
  var inputPreco = document.getElementById("input-preco");

  function tentarAdicionar(){
    var ok = adicionarItem(inputNome.value, inputQtd.value, inputPreco.value);
    if(ok){
      inputNome.value = "";
      inputQtd.value = "";
      inputPreco.value = "";
      inputNome.focus();
    } else {
      inputNome.focus();
    }
  }

  document.getElementById("btn-add").addEventListener("click", tentarAdicionar);
  inputNome.addEventListener("keydown", function(e){ if(e.key === "Enter") tentarAdicionar(); });
  inputPreco.addEventListener("keydown", function(e){ if(e.key === "Enter") tentarAdicionar(); });
  inputQtd.addEventListener("keydown", function(e){ if(e.key === "Enter") tentarAdicionar(); });

  // limitar entrada do preço a dígitos, vírgula e ponto
  inputPreco.addEventListener("input", function(){
    inputPreco.value = inputPreco.value.replace(/[^0-9.,]/g, "");
  });
  inputQtd.addEventListener("input", function(){
    inputQtd.value = inputQtd.value.replace(/[^0-9]/g, "");
  });

  // ---------- Modal limpar tudo ----------
  var modalOverlay = document.getElementById("modal-overlay");
  document.getElementById("btn-clear").addEventListener("click", function(){
    if(items.length === 0) return;
    modalOverlay.classList.add("show");
  });
  document.getElementById("btn-modal-cancelar").addEventListener("click", function(){
    modalOverlay.classList.remove("show");
  });
  document.getElementById("btn-modal-confirmar").addEventListener("click", function(){
    limparTudo();
    modalOverlay.classList.remove("show");
  });
  modalOverlay.addEventListener("click", function(e){
    if(e.target === modalOverlay) modalOverlay.classList.remove("show");
  });

  // ajustar posição do toast conforme altura da barra inferior
  function ajustarAlturaAddbar(){
    var h = document.getElementById("addbar").offsetHeight;
    document.documentElement.style.setProperty("--addbar-h", h + "px");
  }
  window.addEventListener("resize", ajustarAlturaAddbar);

  // ---------- Chips de mercado (genérico: usado na barra de adicionar e no modal de edição) ----------
  var mercadoRowEl = document.getElementById("mercado-row");
  var editMercadoRowEl = document.getElementById("edit-mercado-row");
  var mercadoEdicaoSelecionado = "walmart";

  function renderChipsMercado(containerEl, selecionado){
    containerEl.innerHTML = ORDEM_MERCADOS.map(function(key){
      var m = MERCADOS[key];
      var selected = key === selecionado;
      return (
        '<button type="button" class="mercado-chip' + (selected ? " selected" : "") + '" ' +
          'data-mercado="' + key + '" style="--chip-cor:' + m.cor + '">' +
          '<span class="sigla" style="background:' + m.cor + '">' + m.sigla + '</span>' +
          '<span>' + m.nome + '</span>' +
        '</button>'
      );
    }).join("");
  }

  function renderMercadoChips(){ renderChipsMercado(mercadoRowEl, mercadoSelecionado); }
  function renderMercadoChipsEdicao(){ renderChipsMercado(editMercadoRowEl, mercadoEdicaoSelecionado); }

  mercadoRowEl.addEventListener("click", function(e){
    var btn = e.target.closest(".mercado-chip");
    if(!btn) return;
    mercadoSelecionado = btn.getAttribute("data-mercado");
    renderMercadoChips();
  });

  editMercadoRowEl.addEventListener("click", function(e){
    var btn = e.target.closest(".mercado-chip");
    if(!btn) return;
    mercadoEdicaoSelecionado = btn.getAttribute("data-mercado");
    renderMercadoChipsEdicao();
  });

  // ---------- Editar item ----------
  var editModalOverlay = document.getElementById("edit-modal-overlay");
  var editInputNome = document.getElementById("edit-input-nome");
  var editInputQtd = document.getElementById("edit-input-qtd");
  var editInputPreco = document.getElementById("edit-input-preco");
  var editingId = null;

  function abrirEdicao(id){
    var item = items.find(function(i){ return i.id === id; });
    if(!item) return;
    editingId = id;
    editInputNome.value = item.nome;
    editInputQtd.value = String(item.qtd);
    editInputPreco.value = item.preco != null ? String(item.preco).replace(".", ",") : "";
    mercadoEdicaoSelecionado = item.mercado;
    renderMercadoChipsEdicao();
    editModalOverlay.classList.add("show");
  }

  function fecharEdicao(){
    editModalOverlay.classList.remove("show");
    editingId = null;
  }

  function salvarEdicao(){
    if(editingId == null) return;
    var item = items.find(function(i){ return i.id === editingId; });
    if(!item) return;
    var nome = editInputNome.value.trim();
    if(!nome){
      editInputNome.focus();
      return;
    }
    item.nome = nome;
    item.qtd = parseQtd(editInputQtd.value);
    item.preco = parsePreco(editInputPreco.value);
    item.mercado = mercadoEdicaoSelecionado;
    salvar();
    render();
    fecharEdicao();
  }

  document.getElementById("btn-edit-cancelar").addEventListener("click", fecharEdicao);
  document.getElementById("btn-edit-salvar").addEventListener("click", salvarEdicao);
  editModalOverlay.addEventListener("click", function(e){
    if(e.target === editModalOverlay) fecharEdicao();
  });
  editInputNome.addEventListener("keydown", function(e){ if(e.key === "Enter") salvarEdicao(); });
  editInputQtd.addEventListener("keydown", function(e){ if(e.key === "Enter") salvarEdicao(); });
  editInputPreco.addEventListener("keydown", function(e){ if(e.key === "Enter") salvarEdicao(); });
  editInputPreco.addEventListener("input", function(){
    editInputPreco.value = editInputPreco.value.replace(/[^0-9.,]/g, "");
  });
  editInputQtd.addEventListener("input", function(){
    editInputQtd.value = editInputQtd.value.replace(/[^0-9]/g, "");
  });

  // ---------- Init ----------
  carregar();
  render();
  renderMercadoChips();
  ajustarAlturaAddbar();

  // expõe para testes internos
  window.__test__ = {
    items: function(){ return items; },
    totalCents: totalCents,
    formatCents: formatCents,
    parsePreco: parsePreco,
    adicionarItem: adicionarItem,
    toggleItem: toggleItem,
    removerItem: removerItem,
    desfazerRemocao: desfazerRemocao,
    limparTudo: limparTudo,
    abrirEdicao: abrirEdicao,
    salvarEdicao: salvarEdicao
  };
})();