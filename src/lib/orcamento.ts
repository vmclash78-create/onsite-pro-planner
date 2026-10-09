import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrcamento(id: string) {
  return useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes")
        .select("*, clients(nome, whatsapp, email, documento, locations(endereco, bairro, cidade)), quote_items(id, tipo, descricao, quantidade, valor_unitario, ordem)")
        .eq("id", id).single();
      if (error) throw error;
      data.quote_items.sort((a, b) => a.ordem - b.ordem);
      return data;
    },
  });
}

