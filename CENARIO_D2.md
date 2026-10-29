# Cenário D2: Guloso decidindo a cada 15 min

Decidido em 29/10/2026 para tornar a comparação com o Guloso justa. No cenário D, as políticas aprendidas decidem a cada 15 min
em 85% a 100% das vezes, enquanto o Guloso decide a cada 60 min. O D2 repete o D com o **Guloso decidindo a cada 15 min**.
Código em `simulador_d2/`; `simulador_d/` e `simulador_c2/` não foram alterados.

## O que muda e o que fica igual

- **Regra de escolha do Guloso: igual à do cenário C, sem alteração.** Testa cada ação válida no simulador por 1 h e fica com a
  que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar).
- **Muda só a frequência:** depois de escolher, a ação é aplicada e o simulador avança 15 min (não 60); então ele decide de novo.
  Esperar também vale 15 min.
- Duas versões, como no D: com as 5 ações (ambiente do C2) e só com esperar/desobstruir (ambiente do D).
- **Sem novo treino.** As políticas aprendidas são as do D (redes já escolhidas na validação). O teste usa os mesmos 100 cenários
  × K ∈ {1, 3, 5, 10} = 400 episódios, então a comparação é pareada com tudo o que já foi rodado.

## Como rodar (no seu computador)

```powershell
node simulador_d2/run_d2.js
```

Resultado em `simulador_d2/RESULTADOS_D2.md`: tabela de todos os métodos (Esperar, Aleatória, Guloso a cada 60 e a cada 15 min,
as 6 configurações do D), contrastes pareados, contrastes por orçamento K e ações usadas pelo Guloso. Pode interromper e rodar
de novo: as partes prontas são puladas.

## Suposições

- O horizonte do teste do Guloso continua 1 h (a regra original); só o intervalo entre decisões passa a 15 min.
- O Guloso não usa a antecipação por evento (fim de uma obstrução); com decisões a cada 15 min, isso faria pouca diferença.
