-- ============================================================================
-- Mandato+ | Migração 0004: Agregação SQL de Cidades e Bairros (Escalabilidade)
-- ============================================================================
-- Evita trafegar todas as linhas de `contacts` para o servidor Node.js ao
-- montar filtros de cidade e bairro na base paginada.
-- Valida obrigatoriamente `public.is_tenant_member(p_tenant_id)`.
-- ============================================================================

create or replace function public.get_scope_geo_summary(
  p_tenant_id uuid,
  p_data_scope public.data_scope_enum,
  p_selected_city text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cities jsonb;
  v_neighborhoods jsonb;
begin
  if not public.is_tenant_member(p_tenant_id) then
    raise exception 'Acesso negado ao mandato solicitado.'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('city', city_name, 'count', total_count)
      order by total_count desc, city_name asc
    ),
    '[]'::jsonb
  )
  into v_cities
  from (
    select
      c.city as city_name,
      count(*)::int as total_count
    from public.contacts c
    where c.tenant_id = p_tenant_id
      and c.data_scope = p_data_scope
      and c.city is not null
      and trim(c.city) <> ''
    group by c.city
  ) grouped_cities;

  select coalesce(
    jsonb_agg(neighborhood_name order by neighborhood_name asc),
    '[]'::jsonb
  )
  into v_neighborhoods
  from (
    select distinct c.neighborhood as neighborhood_name
    from public.contacts c
    where c.tenant_id = p_tenant_id
      and c.data_scope = p_data_scope
      and c.neighborhood is not null
      and trim(c.neighborhood) <> ''
      and (
        p_selected_city is null
        or trim(p_selected_city) = ''
        or c.city = trim(p_selected_city)
      )
  ) distinct_neighborhoods;

  return jsonb_build_object(
    'cities', v_cities,
    'neighborhoods', v_neighborhoods
  );
end;
$$;

revoke all on function public.get_scope_geo_summary(uuid, public.data_scope_enum, text) from public;
grant execute on function public.get_scope_geo_summary(uuid, public.data_scope_enum, text) to authenticated;
