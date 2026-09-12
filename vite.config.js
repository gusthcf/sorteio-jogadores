import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE (GitHub Pages):
// O site nao fica na raiz do dominio, e sim em /<nome-do-repositorio>/.
// Por isso o `base` precisa ser exatamente o nome do repositorio entre barras.
// Repositorio: https://github.com/gusthcf/sorteio-jogadores
export default defineConfig({
  plugins: [react()],
  base: '/sorteio-jogadores/',
})
