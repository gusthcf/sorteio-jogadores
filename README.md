<div align="center">

# 🏐 Sorteio de Times

### Acabe com a discussão de quem joga com quem.

Um app de bolso que monta times de vôlei **equilibrados de verdade** em menos de 10 segundos.

[**▶ Abrir o app**](https://gusthcf.github.io/sorteio-jogadores/)

![React](https://img.shields.io/badge/React-18-black?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-black?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3-black?style=flat-square&logo=tailwindcss)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-black?style=flat-square&logo=github)
![Sem back-end](https://img.shields.io/badge/back--end-nenhum-CCFF33?style=flat-square)

</div>

---

## 😤 O problema

Todo grupo de vôlei conhece a cena: a galera chega na quadra, e **os primeiros 15 minutos vão embora decidindo os times**.

- Alguém puxa os amigos e o time fica escandalosamente mais forte.
- O par/ímpar junta os três melhores do mesmo lado.
- O jogo começa desequilibrado, um time atropela o outro e **ninguém se diverte**.
- Na semana seguinte, repete tudo de novo — e sempre saem os mesmos times.

O problema real não é sortear. É **sortear de forma justa**, rápido, com o celular na mão, sem instalar nada e sem depender de quem “tem o app”.

## ✅ A solução

Um site que abre no navegador do celular, funciona **offline depois do primeiro acesso**, não pede cadastro, não tem login e não manda nada para servidor nenhum.

Você cadastra a galera **uma única vez**, dá uma nota de estrelas para cada um, e daí em diante é só: marcar quem veio → escolher o formato → sortear.

<div align="center">

| 1. Elenco | 2. Sorteio | 3. Times |
|:---:|:---:|:---:|
| Cadastre cada jogador com uma nota de **1 a 5 estrelas** (com meia estrela: 2,5 · 3,5 · 4,5) | Marque **quem veio hoje** e escolha quantos times ou quantos jogadores por time | Receba a divisão **mais equilibrada possível** e compartilhe no grupo |

</div>

---

## ⚙️ Como o app funciona

### 1. Elenco (fica salvo no seu celular)

Cadastre nome + nível de cada jogador. A lista é guardada no `localStorage` do navegador, então **ela continua lá mesmo depois de fechar o app ou recarregar a página**. Dá para editar a nota de alguém que evoluiu e excluir quem parou de jogar.

> A nota não é sobre ego — é a forma do app medir a força de cada time. Quanto mais honesta a nota da turma, mais justo fica o jogo.

### 2. Presença e formato do dia

Nem todo mundo vem sempre. Antes de sortear, você marca quem está na quadra naquele dia (um toque em cada nome) e define o formato de duas maneiras:

- **Por número de times** — “quero 3 times”
- **Por tamanho de time** — “quero times de 6”, e o app calcula quantos times cabem

Se a divisão não for exata, o app distribui a sobra e avisa que um time joga com um jogador a mais.

### 3. O sorteio equilibrado

Aqui está o coração do projeto. O objetivo é simples de enunciar e difícil de resolver: **fazer a soma de estrelas de cada time ficar o mais próxima possível**.

O algoritmo trabalha em três camadas ([`src/lib/balance.js`](src/lib/balance.js)):

| Camada | O que faz |
|---|---|
| **1. Snake draft** | Ordena todo mundo da maior para a menor nota e distribui em zigue-zague (1 → 2 → 3 → 3 → 2 → 1…). Isso impede que os craques caiam todos no mesmo time. |
| **2. Hill climbing** | Depois do draft, o app testa trocar jogadores entre os times, par a par, e **só aceita a troca que diminui a diferença** entre o time mais forte e o mais fraco. Repete até não conseguir melhorar mais. |
| **3. Multi-start** | Todo o processo acima roda **centenas de vezes** com embaralhamentos diferentes, e o app fica com a melhor divisão encontrada. |

Na prática, com um elenco típico de 12 a 18 pessoas, a diferença entre o time mais forte e o mais fraco fica em **0 ou 0,5 estrela** — ou seja, empate técnico.

### 4. A regra de ouro: nunca repetir

Clicou em **“Sortear novamente”** com a mesma galera? O app **garante que a divisão exata anterior não volte a sair**.

Cada divisão gerada recebe uma “assinatura” única (quem está com quem, independente da ordem dos times). Todas as assinaturas da sessão ficam num histórico, e o sorteio seguinte só aceita uma combinação **inédita** — sempre escolhendo a mais equilibrada entre as que ainda não saíram.

Se a turma for pequena a ponto de todas as combinações justas já terem saído, o app relaxa um pouco o equilíbrio para conseguir algo novo — e se até isso acabar (matematicamente inevitável com 4 ou 6 pessoas), ele avisa em vez de fingir que sorteou.

### 5. Histórico e compartilhamento

Todos os sorteios do dia ficam listados, com horário e soma de estrelas de cada time. Dá para revisitar qualquer um deles. E o botão de compartilhar joga os times formatados direto no WhatsApp (ou copia para a área de transferência).

---

## 💾 O que é salvo e o que não é

Essa separação é intencional:

| Dado | Comportamento | Por quê |
|---|---|---|
| **Jogadores e estrelas** | 🔒 Salvo no `localStorage` | Você cadastra uma vez e nunca mais |
| **Quem veio hoje** | ♻️ Zera ao recarregar | A presença muda todo dia; começar do zero evita erro |
| **Times sorteados** | ♻️ Zera ao recarregar | É resultado do dia, não configuração |
| **Histórico de sorteios** | ♻️ Zera ao recarregar | O “não repetir” vale para a pelada de hoje |

Nada sai do seu aparelho. **Não existe servidor, banco de dados, conta ou rastreamento.**

---

## 🎨 Detalhes de interface

- **Mobile-first de verdade**: alvos de toque grandes, navegação inferior ao alcance do polegar, respeito às áreas seguras de iPhone.
- **Meia estrela por toque**: metade esquerda da estrela = X,5 · metade direita = X,0.
- Feedback tátil (vibração) no sorteio, em aparelhos que suportam.
- Tema escuro, com a cor vibrante reservada **só** para as ações principais.

---

## 🛠 Stack

- **React 18** — interface em componentes, sem roteador (é uma tela só, com abas)
- **Vite 5** — build enxuto e dev server instantâneo
- **Tailwind CSS 3** — design system direto no markup
- **Zero dependências de UI** — ícones, estrelas, bottom sheets e toasts foram feitos à mão

Bundle final: **~56 KB gzipped**. Abre rápido até no 4G ruim da quadra.

---

## 🚀 Rodando localmente

```bash
git clone https://github.com/gusthcf/sorteio-jogadores.git
cd sorteio-jogadores
npm install
npm run dev
```

O Vite abre em `http://localhost:5173/sorteio-jogadores/`.

## 📦 Publicando no GitHub Pages

O projeto já está configurado. Para publicar uma nova versão:

```bash
npm run deploy
```

Esse comando roda o build e envia a pasta `dist/` para a branch `gh-pages`. O site sai em:

**https://gusthcf.github.io/sorteio-jogadores/**

> ⚠️ O `base` em [`vite.config.js`](vite.config.js) precisa ser exatamente `/sorteio-jogadores/`. Se você renomear o repositório, atualize essa linha — senão o site carrega em branco.

---

## 📁 Estrutura

```
src/
├── lib/
│   ├── balance.js          # Algoritmo de balanceamento e anti-repetição
│   └── storage.js          # Persistência do elenco no localStorage
├── components/
│   ├── PlayersScreen.jsx   # Aba Elenco: listar, editar, excluir
│   ├── PlayerFormSheet.jsx # Cadastro/edição de jogador
│   ├── DrawScreen.jsx      # Aba Sorteio: presença + formato
│   ├── TeamsScreen.jsx     # Aba Times: resultado do sorteio
│   ├── HistorySheet.jsx    # Histórico da sessão
│   ├── StarRating.jsx      # Estrelas com meio ponto
│   ├── Icons.jsx           # Ícones SVG próprios
│   └── Ui.jsx              # Bottom sheet, stepper, toast, avatar…
└── App.jsx                 # Estado geral e navegação
```

---

<div align="center">

Feito para acabar com a discussão e **começar o jogo mais cedo**. 🏐

</div>
