-- Script para padronizar os nomes de clientes e negócios
-- Ele converte nomes como "JOÃO DA SILVA" ou "maria de souza" para "João Da Silva" e "Maria De Souza"

DO $$
BEGIN
    -- Atualiza a tabela de clientes (customers)
    UPDATE public.customers
    SET name = initcap(TRIM(name))
    WHERE name IS NOT NULL;

    -- Atualiza a tabela de oportunidades (opportunities) para manter o sincronismo
    UPDATE public.opportunities
    SET client_name = initcap(TRIM(client_name))
    WHERE client_name IS NOT NULL;
    
    -- Opcionalmente, atualizar também contatos de reuniões agendadas se existirem
    UPDATE public.meetings
    SET client_name = initcap(TRIM(client_name))
    WHERE client_name IS NOT NULL;
END $$;
