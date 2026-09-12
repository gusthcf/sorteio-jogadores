<div align="center">

# 🏐 Sorteio de Times

### Acabe com a discussão de quem joga com quem.

Um app de bolso que monta times de vôlei **equilibrados de verdade** e cuida da fila da quadra durante o dia inteiro.

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
- Quando tem gente de fora, vira outra discussão: quem sai, quem entra, quem completa o time?
- E os iniciantes, que mais precisam de quadra para evoluir, são justamente os que ficam mais tempo sentados.

O problema real não é sortear. É **sortear de forma justa e manter a rotação justa até o fim do dia** — rápido, com o celular na mão, sem instalar nada.

## ✅ A solução

Um site que abre no navegador do celular, não pede cadastro, não tem login e não manda nada para servidor nenhum.

Você cadastra a galera **uma única vez**, dá uma nota de estrelas para cada um, e daí em diante é só: marcar quem veio → sortear → marcar o placar e tocar em **Venceu** no fim de cada partida.

<div align="center">

| 1. Elenco | 2. Sorteio | 3. Quadra | 4. Jogos |
|:---:|:---:|:---:|:---:|
| Cada jogador com nota de **1 a 5 estrelas** (com meia estrela) | Marque **quem veio hoje** | **Placar**, vencedor e a próxima partida montada | **Quantas partidas** cada um jogou no dia |

</div>

---

## ⚙️ Como o app funciona

### 1. Elenco (fica salvo no seu celular)

Cadastre nome + nível de cada jogador. A lista é guardada no `localStorage` do navegador, então **ela continua lá mesmo depois de fechar o app ou recarregar a página**. Dá para editar a nota de alguém que evoluiu e excluir quem parou de jogar.

> A nota não é sobre ego — é a forma do app medir a força de cada time. Quanto mais honesta a nota da turma, mais justo fica o jogo.

### 2. Presença e formato do dia

Antes de sortear, você marca quem está na quadra naquele dia. O formato segue a regra da quadra: **no máximo 6 por time, dois times jogando**. Sempre se formam primeiro dois times completos; quem sobra espera de fora.

| Presentes | Em quadra | De fora (em ordem de entrada) |
|:---:|:---:|:---|
| 11 | Time 1 (6) × Time 2 (5) | ninguém |
| 12 | Time 1 (6) × Time 2 (6) | ninguém |
| 13 | Time 1 (6) × Time 2 (6) | Time 3 (1) |
| 14 | Time 1 (6) × Time 2 (6) | Time 3 (2) |
| 18 | Time 1 (6) × Time 2 (6) | Time 3 (6) |
| 19 | Time 1 (6) × Time 2 (6) | Time 3 (6) → Time 4 (1) |

A tela de sorteio mostra essa prévia em tempo real, conforme você marca a presença. O limite por time pode ser reduzido (para vôlei de areia, por exemplo), nunca aumentado além de 6.

### 3. O sorteio equilibrado

O objetivo é fazer a **soma de estrelas de cada time ficar o mais próxima possível**. O algoritmo trabalha em três camadas ([`src/lib/balance.js`](src/lib/balance.js)):

| Camada | O que faz |
|---|---|
| **1. Snake draft** | Ordena todo mundo da maior para a menor nota e distribui em zigue-zague (1 → 2 → 3 → 3 → 2 → 1…). Os craques não caem todos no mesmo time. |
| **2. Hill climbing** | Testa trocar jogadores entre os times, par a par, e **só aceita a troca que diminui a diferença** entre o time mais forte e o mais fraco. |
| **3. Multi-start** | Repete o processo **centenas de vezes** com embaralhamentos diferentes e fica com a melhor divisão encontrada. |

O time incompleto de fora é comparado pela sua **força projetada**: a soma atual mais a média do grupo para cada vaga que ainda será preenchida. Assim ele não fica nem com os melhores, nem com os piores.

Os testes comparam o resultado com a **força bruta** (todas as divisões possíveis): para 12 e 18 jogadores, o app sempre encontra a menor diferença que existe.

### 4. A regra de ouro: nunca repetir

Pediu um novo sorteio com a mesma galera? O app **garante que a divisão exata anterior não volte a sair**. Cada divisão recebe uma “assinatura” única (quem está com quem), e o sorteio seguinte só aceita combinações **inéditas** no dia — sempre a mais equilibrada entre as que ainda não saíram.

### 5. Controle das partidas (aba Quadra)

Depois do sorteio, a aba **Quadra** vira o placar do dia ([`src/lib/rotation.js`](src/lib/rotation.js)):

1. **Quem vence continua** em quadra.
2. **O primeiro time da fila entra** no lugar de quem perdeu (Time 3, depois Time 4, e assim por diante).
3. **Quem perdeu vai para o fim da fila**.
4. Se não houver ninguém de fora, os mesmos dois times seguem jogando.

#### Placar

Acima do botão **Venceu** de cada time fica o placar, de 0 a 99. **Toque à direita do número para somar um ponto e à esquerda para tirar** — assim uma marcação errada se corrige com um toque. O placar final fica registrado no resultado da partida.

#### Ninguém fica de fora duas partidas seguidas

- Com **até 18 jogadores**, só um time espera por vez — e ele **sempre entra na partida seguinte**.
- Nos **novos sorteios** (automático ou manual), quem ficou de fora na última partida é **obrigado a começar em quadra**. Isso vale também quando alguém chega no meio do dia.
- Um sorteio antigo do histórico só pode ser reutilizado se não colocar de fora, de novo, quem acabou de esperar.
- Com **mais de 18**, dois times esperam e o Time 4 precisa aguardar o Time 3 entrar: nesse caso a espera máxima é de duas partidas.

#### Completando o time que entra

Se o time que vai entrar está incompleto (por exemplo, o Time 3 com 1 jogador), ele é **completado com jogadores do time que perdeu**. Quem continua em quadra não é aleatório:

1. O app calcula todas as combinações possíveis e acha **a de melhor equilíbrio** contra o time vencedor.
2. Considera equilibradas todas as combinações até **1 estrela** acima dessa melhor.
3. Entre elas, **mantém em quadra o maior número possível de iniciantes (0,5, 1 e 1,5★)** — eles precisam jogar mais para evoluir.
4. Depois disso vale o melhor equilíbrio; em empate, fica quem tem menos estrelas e, por último, quem jogou menos partidas no dia.

Se manter um iniciante deixaria a partida desequilibrada além dessa margem, o equilíbrio vence. Os jogadores que continuaram aparecem marcados com a origem (ex.: `T2`).

#### 3 vitórias seguidas = novo sorteio

Se **o mesmo time vencer 3 partidas seguidas**, o app faz **um novo sorteio automaticamente** para reequilibrar o dia. A contagem de partidas continua valendo e quem estava de fora começa jogando.

#### Desfazer

Tocou no time errado? O botão **Desfazer** volta a última ação — resultado de partida, novo sorteio automático, tudo.

### 6. Contador de partidas (aba Jogos)

Cada jogador tem **quantas partidas jogou no dia**, com uma barra comparativa, além do registro de todos os resultados: placar, quem venceu, quem entrou e quem continuou.

### 7. Compartilhamento

O botão de compartilhar manda a partida atual e a fila formatadas direto no WhatsApp (ou copia para a área de transferência).

---

## 💾 O que é salvo e o que não é

| Dado | Comportamento | Por quê |
|---|---|---|
| **Jogadores e estrelas** | 🔒 Salvo no `localStorage` | Você cadastra uma vez e nunca mais |
| **Quem veio hoje** | ♻️ Zera ao recarregar | A presença muda todo dia |
| **Times, fila e sorteios** | ♻️ Zera ao recarregar | É resultado do dia, não configuração |
| **Placar, partidas e contadores** | ♻️ Zera ao recarregar | A contagem vale para a pelada de hoje |

> ⚠️ Como a rotação do dia fica só em memória, **evite recarregar a página no meio da pelada**.

Nada sai do seu aparelho. **Não existe servidor, banco de dados, conta ou rastreamento.**

---

## 🧪 Testes

```bash
npm test
```

A suíte ([`tests/rules.test.js`](tests/rules.test.js)) usa o test runner nativo do Node, sem dependências, e simula **milhares de partidas** exercitando exatamente o mesmo código da tela. Ela verifica:

- formato dos times (13 → 6·6·1, 19 → 6·6·6·1…) e que ninguém some ou aparece duplicado;
- equilíbrio igual ao ótimo encontrado por força bruta (12 e 18 jogadores);
- que um novo sorteio nunca repete a divisão anterior;
- ordem da quadra: vencedor fica, Time 3 antes do Time 4, perdedor para o fim da fila;
- a escolha de quem completa o time: equilíbrio primeiro, iniciantes com prioridade dentro da margem;
- **ninguém fica de fora duas partidas seguidas** com 13 a 18 jogadores, inclusive após sorteios automáticos, manuais e com gente chegando;
- 3 vitórias seguidas disparando o sorteio, contadores de partidas e placar registrado.

---

## 🛠 Stack

- **React 18** — interface em componentes, sem roteador (é uma tela só, com abas)
- **Vite 5** — build enxuto e dev server instantâneo
- **Tailwind CSS 3** — design system direto no markup
- **Zero dependências de UI** — ícones, estrelas, bottom sheets e toasts foram feitos à mão

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

```bash
npm run deploy
```

Esse comando roda o build e envia a pasta `dist/` para a branch `gh-pages`. O site sai em **https://gusthcf.github.io/sorteio-jogadores/**.

> ⚠️ O `base` em [`vite.config.js`](vite.config.js) precisa ser exatamente `/sorteio-jogadores/`. Se você renomear o repositório, atualize essa linha — senão o site carrega em branco.

---

## 📁 Estrutura

```
src/
├── lib/
│   ├── balance.js          # Formato dos times, balanceamento e anti-repetição
│   ├── rotation.js         # Fila da quadra, complemento de times e regra das 3 vitórias
│   ├── day.js              # Estado do dia: sorteios, partidas, placar e "ninguém de fora 2x"
│   ├── teams.js            # Nomes, cores e utilitários dos times
│   └── storage.js          # Persistência do elenco no localStorage
├── components/
│   ├── PlayersScreen.jsx   # Aba Elenco: listar, editar, excluir
│   ├── PlayerFormSheet.jsx # Cadastro/edição de jogador
│   ├── DrawScreen.jsx      # Aba Sorteio: presença + prévia do formato
│   ├── CourtScreen.jsx     # Aba Quadra: placar, vencedor e fila
│   ├── GamesScreen.jsx     # Aba Jogos: partidas por jogador e resultados
│   ├── HistorySheet.jsx    # Sorteios da sessão
│   ├── StarRating.jsx      # Estrelas com meio ponto
│   ├── Icons.jsx           # Ícones SVG próprios
│   └── Ui.jsx              # Bottom sheet, stepper, toast, avatar…
└── App.jsx                 # Telas, navegação e "Desfazer"
tests/
└── rules.test.js           # Regras do dia verificadas por simulação
```

---

<div align="center">

Feito para acabar com a discussão e **começar o jogo mais cedo**. 🏐

</div>
