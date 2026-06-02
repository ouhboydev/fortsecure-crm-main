-- Script para migrar negócios (oportunidades) existentes para o novo sistema de clientes
-- Ele cria um cliente para cada nome que já existe na sua pipeline e faz a vinculação automática.

DO $$
DECLARE
    opp_record RECORD;
    cust_id UUID;
BEGIN
    -- Percorrer todas as oportunidades que ainda não estão vinculadas a um cliente
    FOR opp_record IN 
        SELECT * FROM public.opportunities 
        WHERE customer_id IS NULL 
          AND client_name IS NOT NULL 
          AND TRIM(client_name) != '' 
    LOOP
        -- 1. Verificar se já existe um cliente com o mesmo nome para este usuário (para não duplicar)
        SELECT id INTO cust_id 
        FROM public.customers 
        WHERE TRIM(LOWER(name)) = TRIM(LOWER(opp_record.client_name)) 
          AND owner_id = opp_record.owner_id 
        LIMIT 1;
        
        -- 2. Se o cliente não existir, vamos criá-lo
        IF cust_id IS NULL THEN
            INSERT INTO public.customers (owner_id, name, created_at, updated_at)
            VALUES (opp_record.owner_id, TRIM(opp_record.client_name), opp_record.created_at, opp_record.updated_at)
            RETURNING id INTO cust_id;
        END IF;

        -- 3. Atualizar a oportunidade com o ID do cliente criado/encontrado
        UPDATE public.opportunities 
        SET customer_id = cust_id 
        WHERE id = opp_record.id;
    END LOOP;
END $$;
