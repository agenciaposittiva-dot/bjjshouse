/* =====================================================================
   BJJ'S HOUSE · CONFIGURAÇÃO DA PÁGINA DE VENDAS
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar para colocar a página
   no ar. Preencha os campos entre aspas e publique novamente.
   Campos vazios ("") simplesmente não aparecem na página.
   ===================================================================== */
window.BJJ_CONFIG = {

  /* Data e hora de início do camp (horário de Brasília, -03:00).
     Usada na contagem regressiva. Depois dessa data o contador some. */
  dataEvento: "2026-12-10T09:00:00-03:00",

  /* WhatsApp da equipe: só números, com DDI + DDD. Ex.: "5521999999999".
     Enquanto estiver vazio, o botão flutuante e os botões de WhatsApp ficam ocultos. */
  whatsapp: "",

  /* Mensagem padrão quando a pessoa clica em "Fale conosco". */
  mensagemWhatsapp: "Olá! Quero saber mais sobre o Camp da BJJ'S HOUSE (10 a 13/12).",

  /* Links de pagamento de cada plano (Kiwify, Hotmart, Sympla, Mercado Pago, Asaas...).
     Se um link ficar vazio, o botão abre o WhatsApp com a mensagem do plano já escrita. */
  checkout: {
    diamond: "",
    gold: "",
    silver: "",
    sexta: "",
    sabado: "",
    domingo: "",
    guest: ""
  },

  /* Texto de parcelamento exibido abaixo dos preços. Ex.: "em até 12x no cartão".
     Deixe vazio para não exibir. */
  parcelamento: "",

  /* Vagas restantes por plano (número). Quando preenchido, aparece
     "Restam X vagas" com barra de progresso. Use null para ocultar. */
  vagasRestantes: {
    diamond: null,  // total: 4
    gold: null,
    silver: null
  },

  /* Endereço completo (opcional). Atualiza o rodapé e o mapa. */
  endereco: "",

  /* Redes e contato (opcionais). Ex.: instagram: "bjjshouse" (sem @) */
  instagram: "",
  email: "",

  /* Rastreamento (opcional). Preencha para carregar automaticamente.
     Eventos enviados: PageView, InitiateCheckout (clique em comprar) e Contact (WhatsApp). */
  metaPixelId: "",       // ex.: "123456789012345"
  ga4Id: "",             // ex.: "G-XXXXXXXXXX"

  /* Depoimentos de participantes (opcional). A seção só aparece se houver itens.
     Use apenas depoimentos reais, com autorização de quem escreveu. Exemplo:
     { nome: "Nome Sobrenome", info: "Faixa-roxa · Academia X", texto: "Depoimento..." , foto: "assets/img/depoimento-1.webp" } */
  depoimentos: []
};
