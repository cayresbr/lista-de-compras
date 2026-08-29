(function(){
  "use strict";

  var SUPABASE_URL = 'https://jlbixxvtorrnyiqdwiap.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_Cfs-qyApyxx3Cj7Rn7Pk6g_8BbwrAel';

  var supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

    // ---------- Autenticação ----------

  var authScreenEl = document.getElementById("auth-screen");
  var authEmailEl = document.getElementById("auth-email");
  var authPasswordEl = document.getElementById("auth-password");
  var authMessageEl = document.getElementById("auth-message");
  var btnLoginEl = document.getElementById("btn-login");
  var btnSignupEl = document.getElementById("btn-signup");

    document.getElementById("btn-logout")
    .addEventListener("click", async function(){
      var confirmar = confirm(
        "Deseja sair da sua conta?"
      );

      if(!confirmar){
        return;
      }

      var resultado = await supabaseClient.auth.signOut();

      if(resultado.error){
        console.error(
          "Não foi possível sair:",
          resultado.error
        );

        alert("Não foi possível sair da conta.");
        return;
      }

      items = [];
      render();

      authPasswordEl.value = "";
      mostrarMensagemAuth("");
      authScreenEl.classList.remove("hidden");
    });

  function mostrarMensagemAuth(mensagem, sucesso){
    authMessageEl.textContent = mensagem;
    authMessageEl.classList.toggle("success", !!sucesso);
  }

  function bloquearBotoesAuth(bloquear){
    btnLoginEl.disabled = bloquear;
    btnSignupEl.disabled = bloquear;
  }

  function validarFormularioAuth(){
    var email = authEmailEl.value.trim();
    var senha = authPasswordEl.value;

    if(!email){
      mostrarMensagemAuth("Digite seu e-mail.");
      authEmailEl.focus();
      return null;
    }

    if(!senha){
      mostrarMensagemAuth("Digite sua senha.");
      authPasswordEl.focus();
      return null;
    }

    if(senha.length < 6){
      mostrarMensagemAuth("A senha precisa ter pelo menos 6 caracteres.");
      authPasswordEl.focus();
      return null;
    }

    return {
      email: email,
      senha: senha
    };
  }

  async function criarConta(){
    var dados = validarFormularioAuth();
    if(!dados) return;

    bloquearBotoesAuth(true);
    mostrarMensagemAuth("Criando sua conta...", true);

    var resultado = await supabaseClient.auth.signUp({
      email: dados.email,
      password: dados.senha
    });

    bloquearBotoesAuth(false);

    if(resultado.error){
      mostrarMensagemAuth(resultado.error.message);
      return;
    }

    if(resultado.data.session){
      mostrarMensagemAuth("");
      authScreenEl.classList.add("hidden");
    } else {
      mostrarMensagemAuth(
        "Conta criada! Confira seu e-mail para confirmar o cadastro.",
        true
      );
    }
  }

  async function entrar(){
    var dados = validarFormularioAuth();
    if(!dados) return;

    bloquearBotoesAuth(true);
    mostrarMensagemAuth("Entrando...", true);

    var resultado = await supabaseClient.auth.signInWithPassword({
      email: dados.email,
      password: dados.senha
    });

    bloquearBotoesAuth(false);

    if(resultado.error){
      mostrarMensagemAuth("E-mail ou senha incorretos.");
      return;
    }

    mostrarMensagemAuth("");
    authScreenEl.classList.add("hidden");
    await carregar();
  }

    async function solicitarRedefinicaoSenha(){
    var email = authEmailEl.value.trim();

    if(!email){
      mostrarMensagemAuth(
        "Digite seu e-mail primeiro."
      );

      authEmailEl.focus();
      return;
    }

    var btnReset = document.getElementById(
      "btn-reset-password"
    );

    btnReset.disabled = true;
    btnReset.textContent = "Enviando...";

    var enderecoRetorno =
      window.location.origin + window.location.pathname;

    var resultado = await supabaseClient.auth
      .resetPasswordForEmail(email, {
        redirectTo: enderecoRetorno
      });

    btnReset.disabled = false;
    btnReset.textContent = "Esqueci minha senha";

    if(resultado.error){
      console.error(
        "Erro ao solicitar nova senha:",
        resultado.error
      );

      mostrarMensagemAuth(
        "Não foi possível enviar o e-mail."
      );

      return;
    }

    mostrarMensagemAuth(
      "Enviamos um link para seu e-mail. Confira também a pasta de spam.",
      true
    );
  }

    async function verificarLogin(){
    var resultado = await supabaseClient.auth.getSession();
    var session = resultado.data.session;

    if(session){
      authScreenEl.classList.add("hidden");
      await carregar();
    } else {
      items = [];
      render();
      authScreenEl.classList.remove("hidden");
    }
  }

  btnLoginEl.addEventListener("click", entrar);
  btnSignupEl.addEventListener("click", criarConta);

  document.getElementById("btn-reset-password")
  .addEventListener(
    "click",
    solicitarRedefinicaoSenha
  );

  authPasswordEl.addEventListener("keydown", function(evento){
    if(evento.key === "Enter"){
      entrar();
    }
  });

    supabaseClient.auth.onAuthStateChange(function(evento, session){
    if(evento === "PASSWORD_RECOVERY"){
      setTimeout(async function(){
        var novaSenha = prompt(
          "Digite sua nova senha com pelo menos 6 caracteres:"
        );

        if(!novaSenha){
          return;
        }

        if(novaSenha.length < 6){
          alert(
            "A senha precisa ter pelo menos 6 caracteres."
          );
          return;
        }

        var resultado = await supabaseClient.auth.updateUser({
          password: novaSenha
        });

        if(resultado.error){
          console.error(
            "Erro ao alterar a senha:",
            resultado.error
          );

          alert("Não foi possível alterar a senha.");
          return;
        }

        alert("Senha alterada com sucesso!");

        authPasswordEl.value = "";
        authScreenEl.classList.add("hidden");

        await carregar();
      }, 0);

      return;
    }

    if(session){
      authScreenEl.classList.add("hidden");
    } else {
      authScreenEl.classList.remove("hidden");
    }
  });

  
  var items = [];
  
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

  

    async function carregar(){
    var resultado = await supabaseClient
      .from("itens")
      .select("*")
      .order("created_at", { ascending: true });

    if(resultado.error){
      console.error(
        "Não foi possível carregar os itens:",
        resultado.error
      );

      items = [];
      render();
      return;
    }

    items = resultado.data.map(function(item){
      return {
        id: item.id,
        nome: item.nome,
        qtd: item.qtd,
        preco: item.preco !== null ? Number(item.preco) : null,
        pego: item.pego,
        mercado: item.mercado
      };
    });

    render();
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
    async function adicionarItem(nome, qtdStr, precoStr){
    nome = nome.trim();

    if(!nome){
      return false;
    }

    var novoItem = {
      nome: nome,
      qtd: parseQtd(qtdStr),
      preco: parsePreco(precoStr),
      pego: false,
      mercado: mercadoSelecionado
    };

    var resultado = await supabaseClient
      .from("itens")
      .insert(novoItem)
      .select()
      .single();

    if(resultado.error){
      console.error(
        "Não foi possível adicionar o item:",
        resultado.error
      );

      alert("Não foi possível adicionar o produto.");
      return false;
    }

    var itemSalvo = resultado.data;

    items.push({
      id: itemSalvo.id,
      nome: itemSalvo.nome,
      qtd: itemSalvo.qtd,
      preco: itemSalvo.preco !== null
        ? Number(itemSalvo.preco)
        : null,
      pego: itemSalvo.pego,
      mercado: itemSalvo.mercado
    });

    render();
    return true;
  }

    async function toggleItem(id){
    var item = items.find(function(i){
      return i.id === id;
    });

    if(!item){
      return;
    }

    var novoEstado = !item.pego;

    var resultado = await supabaseClient
      .from("itens")
      .update({
        pego: novoEstado
      })
      .eq("id", id);

    if(resultado.error){
      console.error(
        "Não foi possível atualizar o item:",
        resultado.error
      );

      alert("Não foi possível atualizar o produto.");
      return;
    }

    item.pego = novoEstado;
    render();
  }

    async function removerItem(id){
    var index = items.findIndex(function(i){
      return i.id === id;
    });

    if(index === -1){
      return;
    }

    var removedItem = items[index];

    var resultado = await supabaseClient
      .from("itens")
      .delete()
      .eq("id", id);

    if(resultado.error){
      console.error(
        "Não foi possível remover o item:",
        resultado.error
      );

      alert("Não foi possível remover o produto.");
      return;
    }

    if(pendingRemoval){
      clearTimeout(pendingRemoval.timeoutId);
      pendingRemoval = null;
    }

    items.splice(index, 1);
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

    

    async function desfazerRemocao(){
    if(!pendingRemoval){
      return;
    }

    var remocao = pendingRemoval;

    clearTimeout(remocao.timeoutId);
    pendingRemoval = null;

    var resultado = await supabaseClient
      .from("itens")
      .insert({
        nome: remocao.item.nome,
        qtd: remocao.item.qtd,
        preco: remocao.item.preco,
        pego: remocao.item.pego,
        mercado: remocao.item.mercado
      })
      .select()
      .single();

    if(resultado.error){
      console.error(
        "Não foi possível desfazer a remoção:",
        resultado.error
      );

      esconderToast();
      alert("Não foi possível recuperar o produto.");
      return;
    }

    var itemRecuperado = {
      id: resultado.data.id,
      nome: resultado.data.nome,
      qtd: resultado.data.qtd,
      preco: resultado.data.preco !== null
        ? Number(resultado.data.preco)
        : null,
      pego: resultado.data.pego,
      mercado: resultado.data.mercado
    };

    var index = Math.min(remocao.index, items.length);

    items.splice(index, 0, itemRecuperado);
    render();
    esconderToast();
  }

    async function limparTudo(){
    var resultado = await supabaseClient
      .from("itens")
      .delete()
      .gte("id", 0);

    if(resultado.error){
      console.error(
        "Não foi possível limpar a lista:",
        resultado.error
      );

      alert("Não foi possível limpar a lista.");
      return false;
    }

    items = [];

    if(pendingRemoval){
      clearTimeout(pendingRemoval.timeoutId);
      pendingRemoval = null;
      esconderToast();
    }

    render();
    return true;
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

    async function tentarAdicionar(){
    var btnAdd = document.getElementById("btn-add");

    btnAdd.disabled = true;
    btnAdd.textContent = "Adicionando...";

    var ok = await adicionarItem(
      inputNome.value,
      inputQtd.value,
      inputPreco.value
    );

    btnAdd.disabled = false;
    btnAdd.innerHTML = '<span class="plus">+</span> Adicionar';

    if(ok){
      inputNome.value = "";
      inputQtd.value = "";
      inputPreco.value = "";
    }

    inputNome.focus();
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
    document.getElementById("btn-modal-confirmar")
    .addEventListener("click", async function(){
      var btnConfirmar = document.getElementById(
        "btn-modal-confirmar"
      );

      btnConfirmar.disabled = true;
      btnConfirmar.textContent = "Limpando...";

      var limpou = await limparTudo();

      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Limpar tudo";

      if(limpou){
        modalOverlay.classList.remove("show");
      }
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

    async function salvarEdicao(){
    if(editingId == null){
      return;
    }

    var item = items.find(function(i){
      return i.id === editingId;
    });

    if(!item){
      return;
    }

    var nome = editInputNome.value.trim();

    if(!nome){
      editInputNome.focus();
      return;
    }

    var novosDados = {
      nome: nome,
      qtd: parseQtd(editInputQtd.value),
      preco: parsePreco(editInputPreco.value),
      mercado: mercadoEdicaoSelecionado
    };

    var btnSalvar = document.getElementById("btn-edit-salvar");

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    var resultado = await supabaseClient
      .from("itens")
      .update(novosDados)
      .eq("id", editingId);

    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar";

    if(resultado.error){
      console.error(
        "Não foi possível editar o item:",
        resultado.error
      );

      alert("Não foi possível salvar as alterações.");
      return;
    }

    item.nome = novosDados.nome;
    item.qtd = novosDados.qtd;
    item.preco = novosDados.preco;
    item.mercado = novosDados.mercado;

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
  verificarLogin();
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