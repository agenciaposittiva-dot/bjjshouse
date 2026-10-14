# BJJ'S HOUSE · Página de vendas

Página de vendas do **Camp BJJ'S HOUSE**, com Fernando Tererê e Tainan Dalpra.
10 a 13 de dezembro · Condomínio Portobello · Mangaratiba · RJ.

Site estático (HTML + CSS + JavaScript puro), sem build e sem dependências.
Funciona em qualquer hospedagem: GitHub Pages, Netlify, Vercel, Hostinger, cPanel etc.

---

## Estrutura

```
index.html                 Página de vendas
obrigado.html              Página de obrigado (pós-compra)
assets/
  css/style.css            Estilos (cores da marca no topo do arquivo)
  js/config.js             ← CONFIGURAÇÃO: WhatsApp, links de pagamento, pixel...
  js/main.js               Comportamento (não precisa editar)
  img/                     Fotos, logo, ícones e imagem de compartilhamento
  bjjs-house-camp.ics      Evento para adicionar à agenda
robots.txt / sitemap.xml   SEO
```

## Seções da página

1. **Topo** com faixa de anúncio, contagem regressiva e menu (com menu mobile)
2. **Hero** com chamada principal, mestres, contador e CTA
3. **A experiência** e os três pilares (Aprender · Conviver · Viver)
4. **Os mestres** (autoridade): Fernando Tererê e Tainan Dalpra
5. **A convivência**
6. **O que você vai viver** (benefícios)
7. **Para quem é / para quem não é**
8. **Programação** dos 4 dias
9. **A casa**: galeria com fotos ampliáveis
10. **Ingressos**: Diamond em destaque, Gold, Silver, Day Experience, Guest e **tabela comparativa**
11. **Como garantir sua vaga** (4 passos)
12. **Depoimentos** (aparece só quando você cadastrar)
13. **Dúvidas frequentes**
14. **CTA final** com contagem regressiva
15. **Rodapé** com contato e mapa
16. **Barra fixa de compra** no celular e **botão flutuante do WhatsApp**

### Efeitos visuais

- **Intro animada** com o logo (só na primeira visita da sessão) e entrada do hero letra por letra
- **Parallax** no fundo do hero, nas fotos e nos números gigantes decorativos; leve movimento com o mouse
- **Partículas douradas** no hero e no CTA final, textura de granulação nas seções escuras
- **Faixas em movimento** que aceleram e invertem de direção conforme a rolagem
- **Títulos revelados palavra por palavra** e fotos reveladas com efeito de cortina
- **Galeria da casa horizontal**: no computador a seção fica fixa e as fotos deslizam com a rolagem; no celular, deslize com o dedo
- **Linha do tempo** da programação e dos passos que se preenche ao rolar
- **Contadores animados** (títulos dos mestres, vagas) e contagem regressiva com animação
- **Cards 3D** com brilho que segue o mouse, **botões magnéticos** e com reflexo, **cursor personalizado**
- **Rolagem suave** no computador, cabeçalho que some ao descer e volta ao subir, barra de progresso e botão "voltar ao topo"
- Borda dourada animada no Diamond, FAQ com abertura suave, galeria ampliada com setas e gesto de deslizar

Tudo sem bibliotecas externas e respeitando a opção do sistema "reduzir movimento"
(quem ativa vê a página completa, sem animações).

Também inclui: SEO (title, description, dados estruturados de Evento e FAQ para o Google),
imagem de compartilhamento para WhatsApp/Instagram/Facebook, favicon, acessibilidade
(navegação por teclado, contraste, textos alternativos) e respeito à preferência de
"reduzir movimento" do sistema.

---

## Como configurar (antes de divulgar)

Abra **`assets/js/config.js`** e preencha:

| Campo | O que é | Exemplo |
|---|---|---|
| `whatsapp` | Número da equipe com DDI + DDD, só números (atual: +55 21 99315-0109) | `"5521993150109"` |
| `botoesParaWhatsapp` | `true`: **todos os botões abrem o WhatsApp** (padrão atual). `false`: botões de plano usam o checkout | `true` |
| `checkout.diamond`, `gold`, `silver`, `sexta`, `sabado`, `domingo`, `guest` | Link de pagamento de cada plano (usado só com `botoesParaWhatsapp: false`) | `"https://pay.kiwify.com.br/xxxx"` |
| `parcelamento` | Texto exibido abaixo dos preços | `"em até 12x no cartão"` |
| `vagasRestantes` | Mostra "Restam X vagas" (use `0` para marcar como esgotado) | `{ diamond: 2, gold: null, silver: null }` |
| `endereco` | Endereço completo (atualiza rodapé e mapa) | `"Rua X, 123 · Portobello · Mangaratiba · RJ"` |
| `instagram`, `email` | Contatos exibidos no rodapé | `"bjjshouse"`, `"contato@..."` |
| `metaPixelId`, `ga4Id` | Rastreamento de anúncios (Meta) e Google Analytics | `"1234567890"`, `"G-XXXX"` |
| `depoimentos` | Depoimentos reais de participantes | ver exemplo no arquivo |
| `dataEvento` | Data/hora de início (contagem regressiva) | `"2026-12-10T09:00:00-03:00"` |

### Como os botões funcionam

**Hoje (`botoesParaWhatsapp: true`): todos os botões abrem o WhatsApp** (em nova aba / no app),
cada um com uma mensagem pronta:

| Botão | Mensagem enviada |
|---|---|
| Garantir minha vaga (topo, hero, menu, CTA final, barra do celular) | *Olá! Quero garantir minha vaga no Camp da BJJ'S HOUSE (10 a 13/12). Pode me passar as opções?* |
| Conhecer a experiência | *Olá! Quero conhecer melhor a experiência da BJJ'S HOUSE (10 a 13/12) com Fernando Tererê e Tainan Dalpra.* |
| Ingressos a partir de R$ 500 | *Olá! Quero saber sobre os ingressos do Camp da BJJ'S HOUSE (10 a 13/12).* |
| Quero fazer parte | *Olá! Quero fazer parte da BJJ'S HOUSE (10 a 13/12). Como faço para garantir minha vaga?* |
| Quero viver isso (galeria da casa) | *Olá! Vi as fotos da casa e quero viver essa experiência na BJJ'S HOUSE (10 a 13/12).* |
| Botões de cada plano (Diamond, Gold, Silver, sexta, sábado, domingo, Guest) | *Olá! Quero garantir minha vaga no plano [nome do plano] do Camp BJJ'S HOUSE (10 a 13/12).* |
| Fale conosco / botão verde flutuante | `mensagemWhatsapp` do `config.js` |

Para mudar uma mensagem, edite o atributo `data-wa-msg` do botão no `index.html`
(as dos planos ficam em `assets/js/main.js`). Continuam funcionando normalmente, de propósito:
os itens do menu, as fotos da galeria, os controles (abrir menu, ampliar foto, perguntas,
comparar planos, voltar ao topo) e o botão **Abrir no Google Maps** do rodapé (é o "como chegar").

**Se um dia quiser usar links de pagamento**, mude para `botoesParaWhatsapp: false` e preencha `checkout`:
os botões de plano abrem o checkout e os demais voltam a rolar até a seção indicada
(ingressos ou, no caso de "Conhecer a experiência", a seção da experiência). Os parâmetros de
campanha da URL (`utm_source`, `utm_campaign`, `fbclid`, `gclid`, `src`, `sck`...) são repassados
automaticamente para o link de checkout.

### Eventos de rastreamento enviados

| Ação | Meta Pixel | GA4 |
|---|---|---|
| Abrir a página | `PageView` | `page_view` |
| Ver a seção de ingressos | `ViewContent` | `view_item_list` |
| Clicar em comprar | `InitiateCheckout` (com valor) | `begin_checkout` (com valor) |
| Clicar no WhatsApp | `Contact` | `contact` |
| Chegar na página de obrigado | `CompleteRegistration` | `sign_up` |

### Página de obrigado

Configure na sua plataforma de pagamento o redirecionamento após a compra para:
`https://SEU-DOMINIO/obrigado.html`

---

## Como publicar

### Opção 1 · GitHub Pages (grátis)

1. No GitHub, abra **Settings → Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**.
3. Selecione o branch com o site e a pasta **`/ (root)`** e salve.
4. Em 1 a 2 minutos o site fica no ar em
   `https://agenciaposittiva-dot.github.io/bjjshouse/`.

### Opção 2 · Netlify / Vercel

Importe o repositório e publique. Não há comando de build; a pasta de publicação é a raiz (`/`).

### Usando domínio próprio

Se publicar em um domínio próprio (ex.: `bjjshouse.com.br`), troque o endereço
`https://agenciaposittiva-dot.github.io/bjjshouse/` pelo seu domínio em:
- `index.html` (tags `canonical`, `og:url`, `og:image`, `twitter:image` e os dados estruturados)
- `robots.txt` e `sitemap.xml`

Isso garante que a imagem de compartilhamento apareça corretamente no WhatsApp e nas redes.

---

## Como trocar fotos e textos

- **Fotos**: substitua os arquivos em `assets/img/` mantendo o mesmo nome
  (formato `.webp` recomendado, até ~300 KB cada).
- **Textos e preços**: estão direto no `index.html`, organizados por seção
  (procure pelos comentários `<!-- ===== NOME DA SEÇÃO ===== -->`).
- **Cores**: no topo de `assets/css/style.css` (`--navy`, `--gold`, `--cream`...).

## Ver localmente

Abra o `index.html` no navegador, ou rode um servidor simples na pasta do projeto:

```bash
npx http-server .
# ou
python3 -m http.server 8080
```

## Checklist de lançamento

- [x] WhatsApp preenchido em `config.js` (+55 21 99315-0109) e todos os botões levando ao WhatsApp
- [ ] (Opcional) Links de checkout, se for deixar de vender só pelo WhatsApp
- [ ] (Se usar checkout) Redirecionamento do checkout para `obrigado.html` configurado
- [ ] Meta Pixel e/ou GA4 configurados
- [ ] Domínio definido e URLs de compartilhamento atualizadas
- [ ] Teste do link no WhatsApp (pré-visualização com imagem)
- [ ] Teste no celular: menu, galeria, botões de compra e WhatsApp
