import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_checklist_items():
    existing = await db.checklist_items.count_documents({})
    if existing > 0:
        print("Checklist items already seeded")
        return
    
    items = [
        # Resíduos Sólidos
        {
            "item_id": "chk_residuos_001",
            "tipo_area": "residuos",
            "categoria": "Armazenamento",
            "pergunta": "Os resíduos estão armazenados em área coberta e impermeabilizada?",
            "orientacao_foto": "Tire uma foto geral da área de armazenamento mostrando a cobertura e o piso. A foto deve evidenciar se há proteção contra chuva.",
            "criticidade": "alta",
            "pontos_risco": 15,
            "fundamentacao_legal": "Lei 12.305/2010 Art. 47",
            "ordem": 1
        },
        {
            "item_id": "chk_residuos_002",
            "tipo_area": "residuos",
            "categoria": "Segregação",
            "pergunta": "Os resíduos estão segregados por tipo e classe?",
            "orientacao_foto": "Fotografe os contêineres ou recipientes mostrando identificação e separação por tipo de resíduo.",
            "criticidade": "media",
            "pontos_risco": 10,
            "fundamentacao_legal": "NBR 10004",
            "ordem": 2
        },
        {
            "item_id": "chk_residuos_003",
            "tipo_area": "residuos",
            "categoria": "Identificação",
            "pergunta": "Os recipientes de resíduos possuem identificação clara e legível?",
            "orientacao_foto": "Foto próxima de etiquetas/placas de identificação dos resíduos.",
            "criticidade": "media",
            "pontos_risco": 8,
            "fundamentacao_legal": "ABNT NBR 11174",
            "ordem": 3
        },
        {
            "item_id": "chk_residuos_004",
            "tipo_area": "residuos",
            "categoria": "Documentação",
            "pergunta": "Existe MTR (Manifesto de Transporte de Resíduos) atualizado?",
            "orientacao_foto": "Fotografe o documento MTR mais recente.",
            "criticidade": "alta",
            "pontos_risco": 20,
            "fundamentacao_legal": "Lei 12.305/2010",
            "ordem": 4
        },
        {
            "item_id": "chk_residuos_005",
            "tipo_area": "residuos",
            "categoria": "Destinação",
            "pergunta": "A empresa possui contrato com empresa licenciada para destinação de resíduos?",
            "orientacao_foto": "Fotografe a primeira página do contrato e a licença ambiental da empresa destinadora.",
            "criticidade": "critica",
            "pontos_risco": 25,
            "fundamentacao_legal": "Lei 12.305/2010 Art. 25",
            "ordem": 5
        },
        
        # Efluentes
        {
            "item_id": "chk_efluentes_001",
            "tipo_area": "efluentes",
            "categoria": "Tratamento",
            "pergunta": "O sistema de tratamento de efluentes está operando?",
            "orientacao_foto": "Foto geral do sistema de tratamento em funcionamento (tanques, bombas, etc).",
            "criticidade": "critica",
            "pontos_risco": 30,
            "fundamentacao_legal": "Resolução CONAMA 430/2011",
            "ordem": 1
        },
        {
            "item_id": "chk_efluentes_002",
            "tipo_area": "efluentes",
            "categoria": "Manutenção",
            "pergunta": "Há registro de manutenção preventiva do sistema nos últimos 6 meses?",
            "orientacao_foto": "Fotografe o livro de registro ou planilha de manutenção.",
            "criticidade": "alta",
            "pontos_risco": 15,
            "fundamentacao_legal": "NBR ISO 14001",
            "ordem": 2
        },
        {
            "item_id": "chk_efluentes_003",
            "tipo_area": "efluentes",
            "categoria": "Monitoramento",
            "pergunta": "Existe ponto de coleta para análise de qualidade dos efluentes?",
            "orientacao_foto": "Foto do ponto de coleta identificado.",
            "criticidade": "alta",
            "pontos_risco": 18,
            "fundamentacao_legal": "Resolução CONAMA 430/2011",
            "ordem": 3
        },
        {
            "item_id": "chk_efluentes_004",
            "tipo_area": "efluentes",
            "categoria": "Análises",
            "pergunta": "As análises laboratoriais estão atualizadas (últimos 3 meses)?",
            "orientacao_foto": "Fotografe o laudo laboratorial mais recente.",
            "criticidade": "alta",
            "pontos_risco": 20,
            "fundamentacao_legal": "Licença de Operação",
            "ordem": 4
        },
        {
            "item_id": "chk_efluentes_005",
            "tipo_area": "efluentes",
            "categoria": "Contenção",
            "pergunta": "Não há evidências de vazamentos ou transbordamentos?",
            "orientacao_foto": "Foto das tubulações, conexões e áreas ao redor do sistema.",
            "criticidade": "critica",
            "pontos_risco": 25,
            "fundamentacao_legal": "Lei de Crimes Ambientais",
            "ordem": 5
        },
        
        # APP - Área de Preservação Permanente
        {
            "item_id": "chk_app_001",
            "tipo_area": "app",
            "categoria": "Delimitação",
            "pergunta": "A APP está delimitada fisicamente (cerca, placa)?",
            "orientacao_foto": "Foto da cerca ou marco delimitador da APP.",
            "criticidade": "alta",
            "pontos_risco": 15,
            "fundamentacao_legal": "Código Florestal Lei 12.651/2012",
            "ordem": 1
        },
        {
            "item_id": "chk_app_002",
            "tipo_area": "app",
            "categoria": "Vegetação",
            "pergunta": "A vegetação nativa está preservada sem sinais de degradação?",
            "orientacao_foto": "Foto panorâmica da área vegetada.",
            "criticidade": "alta",
            "pontos_risco": 20,
            "fundamentacao_legal": "Código Florestal",
            "ordem": 2
        },
        {
            "item_id": "chk_app_003",
            "tipo_area": "app",
            "categoria": "Resíduos",
            "pergunta": "A APP está livre de resíduos ou entulhos?",
            "orientacao_foto": "Foto da área mostrando ausência de lixo ou entulho.",
            "criticidade": "media",
            "pontos_risco": 12,
            "fundamentacao_legal": "Lei de Crimes Ambientais",
            "ordem": 3
        },
        {
            "item_id": "chk_app_004",
            "tipo_area": "app",
            "categoria": "Acesso",
            "pergunta": "O acesso à APP é controlado e restrito?",
            "orientacao_foto": "Foto do portão ou barreira de acesso.",
            "criticidade": "media",
            "pontos_risco": 10,
            "fundamentacao_legal": "Código Florestal",
            "ordem": 4
        },
        
        # Armazenamento de Produtos
        {
            "item_id": "chk_armazenamento_001",
            "tipo_area": "armazenamento",
            "categoria": "Estrutura",
            "pergunta": "A área de armazenamento possui piso impermeabilizado e bacia de contenção?",
            "orientacao_foto": "Foto do piso e sistema de contenção.",
            "criticidade": "critica",
            "pontos_risco": 25,
            "fundamentacao_legal": "NBR 17505",
            "ordem": 1
        },
        {
            "item_id": "chk_armazenamento_002",
            "tipo_area": "armazenamento",
            "categoria": "FISPQ",
            "pergunta": "Todas as FISPQs dos produtos químicos estão disponíveis e atualizadas?",
            "orientacao_foto": "Foto da pasta de FISPQs ou arquivo digital.",
            "criticidade": "alta",
            "pontos_risco": 15,
            "fundamentacao_legal": "NR-26",
            "ordem": 2
        },
        {
            "item_id": "chk_armazenamento_003",
            "tipo_area": "armazenamento",
            "categoria": "Rotulagem",
            "pergunta": "Todos os produtos estão adequadamente rotulados?",
            "orientacao_foto": "Foto de produtos mostrando rótulos.",
            "criticidade": "media",
            "pontos_risco": 10,
            "fundamentacao_legal": "ABNT NBR 14725",
            "ordem": 3
        },
        {
            "item_id": "chk_armazenamento_004",
            "tipo_area": "armazenamento",
            "categoria": "Segregação",
            "pergunta": "Produtos incompatíveis estão armazenados separadamente?",
            "orientacao_foto": "Foto geral do layout de armazenamento.",
            "criticidade": "alta",
            "pontos_risco": 18,
            "fundamentacao_legal": "NBR 17505",
            "ordem": 4
        },
        {
            "item_id": "chk_armazenamento_005",
            "tipo_area": "armazenamento",
            "categoria": "Emergência",
            "pergunta": "Kit de emergência para vazamentos está disponível?",
            "orientacao_foto": "Foto do kit de emergência.",
            "criticidade": "alta",
            "pontos_risco": 15,
            "fundamentacao_legal": "NR-26",
            "ordem": 5
        },
        
        # Área de Produção
        {
            "item_id": "chk_producao_001",
            "tipo_area": "producao",
            "categoria": "Emissões",
            "pergunta": "Os sistemas de controle de emissões atmosféricas estão operando?",
            "orientacao_foto": "Foto dos equipamentos de controle (filtros, lavadores, etc).",
            "criticidade": "alta",
            "pontos_risco": 20,
            "fundamentacao_legal": "Resolução CONAMA 382/2006",
            "ordem": 1
        },
        {
            "item_id": "chk_producao_002",
            "tipo_area": "producao",
            "categoria": "Ruído",
            "pergunta": "Há medições de ruído atualizadas (últimos 12 meses)?",
            "orientacao_foto": "Fotografe o laudo de medição de ruído.",
            "criticidade": "media",
            "pontos_risco": 10,
            "fundamentacao_legal": "NBR 10151",
            "ordem": 2
        },
        {
            "item_id": "chk_producao_003",
            "tipo_area": "producao",
            "categoria": "Limpeza",
            "pergunta": "A área de produção está limpa e organizada?",
            "orientacao_foto": "Foto geral da área de produção.",
            "criticidade": "baixa",
            "pontos_risco": 5,
            "fundamentacao_legal": "NBR ISO 14001",
            "ordem": 3
        },
        {
            "item_id": "chk_producao_004",
            "tipo_area": "producao",
            "categoria": "Ventilação",
            "pergunta": "Os sistemas de ventilação/exaustão estão funcionando adequadamente?",
            "orientacao_foto": "Foto dos exaustores e sistemas de ventilação.",
            "criticidade": "media",
            "pontos_risco": 12,
            "fundamentacao_legal": "NR-15",
            "ordem": 4
        }
    ]
    
    await db.checklist_items.insert_many(items)
    print(f"Seeded {len(items)} checklist items")

async def main():
    print("Starting seed...")
    await seed_checklist_items()
    print("Seed completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())