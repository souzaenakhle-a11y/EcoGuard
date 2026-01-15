from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from datetime import datetime, timezone, timedelta
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import gridfs
import io
import httpx
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs = AsyncIOMotorGridFSBucket(db)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Cliente(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cliente_id: str
    user_id: str
    nome: str
    email: str
    telefone: Optional[str] = None
    created_at: datetime

class ClienteCreate(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = None

class Empresa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    empresa_id: str
    cliente_id: Optional[str] = None
    user_id: str
    nome: str
    cnpj: str
    setor: str
    tipo_estabelecimento: Optional[str] = "matriz"
    endereco: Optional[str] = None
    responsavel: Optional[str] = None
    telefone: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class EmpresaCreate(BaseModel):
    nome: str
    cnpj: str
    setor: str = "Geral"
    tipo_estabelecimento: str = "matriz"
    endereco: Optional[str] = None
    responsavel: Optional[str] = None
    telefone: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None

class PlantaEstabelecimento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    planta_id: str
    empresa_id: str
    nome: str
    arquivo_id: str
    tipo_arquivo: str
    status: str = "aguardando_marcacao"
    created_at: datetime

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket_id: str
    empresa_id: str
    user_id: str
    user_email: str
    planta_id: str
    status: str  # aberto, aguardando_fotos_cliente, aguardando_analise_gestor, concluido
    etapa: str  # mapeamento_gestor, upload_fotos_cliente, analise_gestor, finalizado
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

class TicketMensagem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mensagem_id: str
    ticket_id: str
    user_id: str
    user_email: str
    user_role: str  # cliente ou gestor
    mensagem: str
    tipo: str  # mensagem, status_change, apontamento
    created_at: datetime

class AreaCritica(BaseModel):
    model_config = ConfigDict(extra="ignore")
    area_id: str
    planta_id: str
    nome: str
    tipo_area: str
    posicao_x: float
    posicao_y: float
    descricao: Optional[str] = None
    criticidade: str = "media"
    created_at: datetime

class AreaCriticaCreate(BaseModel):
    nome: str
    tipo_area: str
    posicao_x: float
    posicao_y: float
    descricao: Optional[str] = None
    criticidade: str = "media"

class ChecklistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str
    tipo_area: str
    categoria: str
    pergunta: str
    orientacao_foto: str
    criticidade: str
    pontos_risco: int
    fundamentacao_legal: Optional[str] = None
    ordem: int

class AutoInspecao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    inspecao_id: str
    empresa_id: str
    planta_id: str
    data_inspecao: datetime
    status: str
    score_final: Optional[float] = None
    nivel_risco: Optional[str] = None
    total_itens: int
    itens_conformes: int
    itens_nao_conformes: int
    created_at: datetime
    completed_at: Optional[datetime] = None

class InspecaoItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_inspecao_id: str
    inspecao_id: str
    area_critica_id: str
    checklist_item_id: str
    resposta: Optional[str] = None
    foto_id: Optional[str] = None
    observacao: Optional[str] = None
    risco_detectado: bool = False
    data_resposta: Optional[datetime] = None
    ordem: int

class InspecaoItemUpdate(BaseModel):
    resposta: str
    observacao: Optional[str] = None

class Alerta(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alerta_id: str
    inspecao_id: str
    area_critica_id: Optional[str] = None
    tipo_alerta: str
    descricao: str
    gravidade: str
    valor_multa_estimado: Optional[float] = None
    status: str = "pendente"
    prazo_sugerido_dias: Optional[int] = None
    created_at: datetime

class Condicionante(BaseModel):
    model_config = ConfigDict(extra="ignore")
    condicionante_id: str
    licenca_id: str
    nome: str
    data_acompanhamento: datetime
    alerta_acompanhamento: datetime
    responsavel_nome: str
    responsavel_email: str
    descricao: str
    status: str = "em_andamento"
    percentual_conclusao: int = 0
    observacoes: Optional[str] = None
    nova_data_acompanhamento: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class CondicionanteCreate(BaseModel):
    nome: str
    data_acompanhamento: str
    alerta_acompanhamento: str
    responsavel_nome: str
    responsavel_email: str
    descricao: str

class CondicionanteUpdate(BaseModel):
    nome: Optional[str] = None
    data_acompanhamento: Optional[str] = None
    alerta_acompanhamento: Optional[str] = None
    responsavel_nome: Optional[str] = None
    responsavel_email: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    percentual_conclusao: Optional[int] = None
    observacoes: Optional[str] = None
    nova_data_acompanhamento: Optional[str] = None

class LicencaDocumento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    licenca_id: str
    empresa_id: str
    nome_licenca: str
    numero_licenca: str
    tipo: str
    orgao_emissor: str
    data_emissao: datetime
    data_validade: datetime
    dias_alerta_vencimento: int = 30
    arquivo_id: Optional[str] = None
    observacoes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

class LicencaDocumentoCreate(BaseModel):
    empresa_id: str
    nome_licenca: str
    numero_licenca: str
    tipo: str
    orgao_emissor: str
    data_emissao: str
    data_validade: str
    dias_alerta_vencimento: int = 30
    observacoes: Optional[str] = None

class LicencaDocumentoUpdate(BaseModel):
    nome_licenca: Optional[str] = None
    numero_licenca: Optional[str] = None
    tipo: Optional[str] = None
    orgao_emissor: Optional[str] = None
    data_emissao: Optional[str] = None
    data_validade: Optional[str] = None
    dias_alerta_vencimento: Optional[int] = None
    observacoes: Optional[str] = None

# Auth Helper
GESTORES_EMAILS = ["souzaenakhle@gmail.com"]
SENDER_EMAIL = "EcoGuard <onboarding@resend.dev>"

# Configure Resend
resend.api_key = os.environ.get('RESEND_API_KEY')

async def enviar_email_notificacao(destinatario_email: str, assunto: str, mensagem: str):
    """Envia email de notificação usando Resend"""
    try:
        if not resend.api_key:
            logger.warning("RESEND_API_KEY não configurada. Email não enviado.")
            return
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #16a34a; margin-bottom: 20px;">🌿 EcoGuard - Sistema de Auto-Fiscalização</h2>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">{mensagem}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">Este é um email automático. Não responda diretamente.</p>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [destinatario_email],
            "subject": assunto,
            "html": html_content
        }
        
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"📧 Email enviado para {destinatario_email}: {assunto}")
        return email
    except Exception as e:
        logger.error(f"Erro ao enviar email: {e}")

async def get_current_user(request: Request) -> User:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

def is_gestor(user: User) -> bool:
    return user.email in GESTORES_EMAILS

# Auth Routes
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        data = resp.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data["name"],
                "picture": data.get("picture")
            }}
        )
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        })
    
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_data

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# Cliente Routes
@api_router.get("/clientes", response_model=List[Cliente])
async def get_clientes(request: Request):
    user = await get_current_user(request)
    clientes = await db.clientes.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return clientes

@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(cliente_data: ClienteCreate, request: Request):
    user = await get_current_user(request)
    
    cliente_id = f"cli_{uuid.uuid4().hex[:12]}"
    cliente_dict = {
        "cliente_id": cliente_id,
        "user_id": user.user_id,
        **cliente_data.model_dump(),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.clientes.insert_one(cliente_dict)
    cliente_doc = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0})
    return Cliente(**cliente_doc)

@api_router.get("/clientes/{cliente_id}", response_model=Cliente)
async def get_cliente(cliente_id: str, request: Request):
    user = await get_current_user(request)
    cliente = await db.clientes.find_one(
        {"cliente_id": cliente_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return Cliente(**cliente)

# Empresa Routes
@api_router.get("/empresas", response_model=List[Empresa])
async def get_empresas(request: Request, cliente_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {"user_id": user.user_id}
    if cliente_id:
        query["cliente_id"] = cliente_id
    empresas = await db.empresas.find(query, {"_id": 0}).to_list(100)
    return empresas

@api_router.post("/empresas", response_model=Empresa)
async def create_empresa(empresa_data: EmpresaCreate, request: Request):
    user = await get_current_user(request)
    
    empresa_id = f"emp_{uuid.uuid4().hex[:12]}"
    empresa_dict = {
        "empresa_id": empresa_id,
        "cliente_id": "default_client",
        "user_id": user.user_id,
        **empresa_data.model_dump(),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.empresas.insert_one(empresa_dict)
    empresa_doc = await db.empresas.find_one({"empresa_id": empresa_id}, {"_id": 0})
    return Empresa(**empresa_doc)

@api_router.get("/empresas/{empresa_id}", response_model=Empresa)
async def get_empresa(empresa_id: str, request: Request):
    user = await get_current_user(request)
    empresa = await db.empresas.find_one(
        {"empresa_id": empresa_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa not found")
    return Empresa(**empresa)

@api_router.delete("/empresas/{empresa_id}")
async def delete_empresa(empresa_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.empresas.delete_one({"empresa_id": empresa_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empresa not found")
    return {"message": "Empresa deleted"}

# Planta Routes
@api_router.post("/plantas")
async def upload_planta(
    empresa_id: str = Form(...),
    nome: str = Form(...),
    file: UploadFile = File(...),
    request: Request = None
):
    user = await get_current_user(request)
    
    empresa = await db.empresas.find_one(
        {"empresa_id": empresa_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa not found")
    
    file_content = await file.read()
    file_id = await fs.upload_from_stream(
        file.filename,
        io.BytesIO(file_content),
        metadata={"content_type": file.content_type}
    )
    
    planta_id = f"plt_{uuid.uuid4().hex[:12]}"
    planta_dict = {
        "planta_id": planta_id,
        "empresa_id": empresa_id,
        "nome": nome,
        "arquivo_id": str(file_id),
        "tipo_arquivo": file.content_type,
        "status": "aguardando_marcacao",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.plantas_estabelecimento.insert_one(planta_dict)
    
    # Criar ticket automaticamente
    ticket_id = f"tkt_{uuid.uuid4().hex[:12]}"
    ticket_dict = {
        "ticket_id": ticket_id,
        "empresa_id": empresa_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "planta_id": planta_id,
        "status": "aberto",
        "etapa": "mapeamento_gestor",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "closed_at": None
    }
    await db.tickets.insert_one(ticket_dict)
    
    # Enviar email para gestor
    await enviar_email_notificacao(
        GESTORES_EMAILS[0],
        "Novo Ticket - EcoGuard",
        f"Nova planta enviada por {user.email}. Ticket #{ticket_id[-8:]}. Acesse o sistema para mapear as áreas críticas."
    )
    
    # Criar mensagem inicial
    mensagem_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.ticket_mensagens.insert_one({
        "mensagem_id": mensagem_id,
        "ticket_id": ticket_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_role": "cliente",
        "mensagem": "Planta enviada para análise",
        "tipo": "status_change",
        "created_at": datetime.now(timezone.utc)
    })
    
    planta_doc = await db.plantas_estabelecimento.find_one({"planta_id": planta_id}, {"_id": 0})
    return {**planta_doc, "ticket_id": ticket_id}

@api_router.get("/plantas/{empresa_id}", response_model=List[PlantaEstabelecimento])
async def get_plantas(empresa_id: str, request: Request):
    user = await get_current_user(request)
    plantas = await db.plantas_estabelecimento.find(
        {"empresa_id": empresa_id},
        {"_id": 0}
    ).to_list(100)
    return plantas

@api_router.get("/plantas/{planta_id}/file")
async def get_planta_file(planta_id: str, request: Request):
    user = await get_current_user(request)
    planta = await db.plantas_estabelecimento.find_one({"planta_id": planta_id}, {"_id": 0})
    
    if not planta:
        raise HTTPException(status_code=404, detail="Planta not found")
    
    from bson import ObjectId
    file_stream = await fs.open_download_stream(ObjectId(planta["arquivo_id"]))
    file_content = await file_stream.read()
    
    return Response(
        content=file_content,
        media_type=planta["tipo_arquivo"]
    )

@api_router.put("/plantas/{planta_id}")
async def update_planta(planta_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    
    await db.plantas_estabelecimento.update_one(
        {"planta_id": planta_id},
        {"$set": body}
    )
    
    return {"message": "Planta updated"}

# Área Crítica Routes
@api_router.post("/areas/{planta_id}", response_model=AreaCritica)
async def create_area(planta_id: str, area_data: AreaCriticaCreate, request: Request):
    user = await get_current_user(request)
    
    area_id = f"area_{uuid.uuid4().hex[:12]}"
    area_dict = {
        "area_id": area_id,
        "planta_id": planta_id,
        **area_data.model_dump(),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.areas_criticas.insert_one(area_dict)
    
    await db.plantas_estabelecimento.update_one(
        {"planta_id": planta_id},
        {"$set": {"status": "mapeada"}}
    )
    
    area_doc = await db.areas_criticas.find_one({"area_id": area_id}, {"_id": 0})
    return AreaCritica(**area_doc)

@api_router.get("/areas/{planta_id}", response_model=List[AreaCritica])
async def get_areas(planta_id: str, request: Request):
    user = await get_current_user(request)
    areas = await db.areas_criticas.find({"planta_id": planta_id}, {"_id": 0}).to_list(100)
    return areas

@api_router.delete("/areas/{area_id}")
async def delete_area(area_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.areas_criticas.delete_one({"area_id": area_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Area not found")
    return {"message": "Area deleted"}

# Checklist Routes
@api_router.get("/checklist/{tipo_area}", response_model=List[ChecklistItem])
async def get_checklist_items(tipo_area: str, request: Request):
    user = await get_current_user(request)
    items = await db.checklist_items.find({"tipo_area": tipo_area}, {"_id": 0}).sort("ordem", 1).to_list(100)
    return items

# Inspeção Routes
@api_router.post("/inspecoes", response_model=AutoInspecao)
async def create_inspecao(empresa_id: str, planta_id: str, request: Request):
    user = await get_current_user(request)
    
    areas = await db.areas_criticas.find({"planta_id": planta_id}, {"_id": 0}).to_list(100)
    
    if not areas:
        raise HTTPException(status_code=400, detail="No areas found for this planta")
    
    inspecao_id = f"insp_{uuid.uuid4().hex[:12]}"
    
    total_itens = 0
    ordem = 0
    
    for area in areas:
        checklist_items = await db.checklist_items.find(
            {"tipo_area": area["tipo_area"]},
            {"_id": 0}
        ).to_list(100)
        
        for item in checklist_items:
            item_inspecao_id = f"itinsp_{uuid.uuid4().hex[:12]}"
            await db.inspecao_itens.insert_one({
                "item_inspecao_id": item_inspecao_id,
                "inspecao_id": inspecao_id,
                "area_critica_id": area["area_id"],
                "checklist_item_id": item["item_id"],
                "resposta": None,
                "foto_id": None,
                "observacao": None,
                "risco_detectado": False,
                "data_resposta": None,
                "ordem": ordem
            })
            total_itens += 1
            ordem += 1
    
    inspecao_dict = {
        "inspecao_id": inspecao_id,
        "empresa_id": empresa_id,
        "planta_id": planta_id,
        "data_inspecao": datetime.now(timezone.utc),
        "status": "em_andamento",
        "score_final": None,
        "nivel_risco": None,
        "total_itens": total_itens,
        "itens_conformes": 0,
        "itens_nao_conformes": 0,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    
    await db.auto_inspecoes.insert_one(inspecao_dict)
    inspecao_doc = await db.auto_inspecoes.find_one({"inspecao_id": inspecao_id}, {"_id": 0})
    return AutoInspecao(**inspecao_doc)

@api_router.get("/inspecoes/{inspecao_id}", response_model=AutoInspecao)
async def get_inspecao(inspecao_id: str, request: Request):
    user = await get_current_user(request)
    inspecao = await db.auto_inspecoes.find_one({"inspecao_id": inspecao_id}, {"_id": 0})
    if not inspecao:
        raise HTTPException(status_code=404, detail="Inspeção not found")
    return AutoInspecao(**inspecao)

@api_router.get("/inspecoes/{inspecao_id}/items")
async def get_inspecao_items(inspecao_id: str, request: Request):
    user = await get_current_user(request)
    
    items = await db.inspecao_itens.find(
        {"inspecao_id": inspecao_id},
        {"_id": 0}
    ).sort("ordem", 1).to_list(1000)
    
    result = []
    for item in items:
        area = await db.areas_criticas.find_one(
            {"area_id": item["area_critica_id"]},
            {"_id": 0}
        )
        checklist_item = await db.checklist_items.find_one(
            {"item_id": item["checklist_item_id"]},
            {"_id": 0}
        )
        result.append({
            **item,
            "area": area,
            "checklist_item": checklist_item
        })
    
    return result

@api_router.put("/inspecoes/{inspecao_id}/items/{item_inspecao_id}")
async def update_inspecao_item(
    inspecao_id: str,
    item_inspecao_id: str,
    resposta: str = Form(...),
    observacao: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None),
    request: Request = None
):
    user = await get_current_user(request)
    
    foto_id = None
    if foto:
        file_content = await foto.read()
        file_id = await fs.upload_from_stream(
            foto.filename,
            io.BytesIO(file_content),
            metadata={"content_type": foto.content_type}
        )
        foto_id = str(file_id)
    
    risco_detectado = resposta == "nao_conforme"
    
    await db.inspecao_itens.update_one(
        {"item_inspecao_id": item_inspecao_id, "inspecao_id": inspecao_id},
        {"$set": {
            "resposta": resposta,
            "foto_id": foto_id,
            "observacao": observacao,
            "risco_detectado": risco_detectado,
            "data_resposta": datetime.now(timezone.utc)
        }}
    )
    
    item_doc = await db.inspecao_itens.find_one({"item_inspecao_id": item_inspecao_id}, {"_id": 0})
    return item_doc

@api_router.get("/inspecoes/{inspecao_id}/items/{item_inspecao_id}/foto")
async def get_item_foto(inspecao_id: str, item_inspecao_id: str, request: Request):
    user = await get_current_user(request)
    item = await db.inspecao_itens.find_one(
        {"item_inspecao_id": item_inspecao_id, "inspecao_id": inspecao_id},
        {"_id": 0}
    )
    
    if not item or not item.get("foto_id"):
        raise HTTPException(status_code=404, detail="Foto not found")
    
    from bson import ObjectId
    file_stream = await fs.open_download_stream(ObjectId(item["foto_id"]))
    file_content = await file_stream.read()
    
    return Response(content=file_content, media_type="image/jpeg")

@api_router.post("/inspecoes/{inspecao_id}/complete")
async def complete_inspecao(inspecao_id: str, request: Request):
    user = await get_current_user(request)
    
    items = await db.inspecao_itens.find({"inspecao_id": inspecao_id}, {"_id": 0}).to_list(1000)
    
    total = len(items)
    conformes = len([i for i in items if i.get("resposta") == "conforme"])
    nao_conformes = len([i for i in items if i.get("resposta") == "nao_conforme"])
    
    score = (conformes / total * 100) if total > 0 else 0
    
    if score >= 80:
        nivel_risco = "baixo"
    elif score >= 60:
        nivel_risco = "medio"
    elif score >= 40:
        nivel_risco = "alto"
    else:
        nivel_risco = "critico"
    
    await db.auto_inspecoes.update_one(
        {"inspecao_id": inspecao_id},
        {"$set": {
            "status": "concluida",
            "score_final": round(score, 2),
            "nivel_risco": nivel_risco,
            "itens_conformes": conformes,
            "itens_nao_conformes": nao_conformes,
            "completed_at": datetime.now(timezone.utc)
        }}
    )
    
    # Criar alertas para itens não conformes
    nao_conformes_items = [i for i in items if i.get("resposta") == "nao_conforme"]
    
    for item in nao_conformes_items:
        checklist_item = await db.checklist_items.find_one(
            {"item_id": item["checklist_item_id"]},
            {"_id": 0}
        )
        
        if checklist_item:
            alerta_id = f"alert_{uuid.uuid4().hex[:12]}"
            multa_estimada = checklist_item.get("pontos_risco", 10) * 5000
            
            await db.alertas.insert_one({
                "alerta_id": alerta_id,
                "inspecao_id": inspecao_id,
                "area_critica_id": item["area_critica_id"],
                "tipo_alerta": checklist_item["categoria"],
                "descricao": checklist_item["pergunta"],
                "gravidade": checklist_item["criticidade"],
                "valor_multa_estimado": multa_estimada,
                "status": "pendente",
                "prazo_sugerido_dias": 30 if checklist_item["criticidade"] == "alta" else 60,
                "created_at": datetime.now(timezone.utc)
            })
    
    inspecao_doc = await db.auto_inspecoes.find_one({"inspecao_id": inspecao_id}, {"_id": 0})
    return AutoInspecao(**inspecao_doc)

# Dashboard Routes
@api_router.get("/dashboard/{empresa_id}")
async def get_dashboard(empresa_id: str, request: Request):
    user = await get_current_user(request)
    
    inspecoes = await db.auto_inspecoes.find(
        {"empresa_id": empresa_id},
        {"_id": 0}
    ).sort("data_inspecao", -1).to_list(100)
    
    ultima_inspecao = inspecoes[0] if inspecoes else None
    
    alertas = []
    if ultima_inspecao:
        alertas = await db.alertas.find(
            {"inspecao_id": ultima_inspecao["inspecao_id"], "status": "pendente"},
            {"_id": 0}
        ).sort("gravidade", -1).to_list(100)
    
    licencas = await db.licencas_documentos.find(
        {"empresa_id": empresa_id},
        {"_id": 0}
    ).to_list(100)
    
    for licenca in licencas:
        if licenca.get("data_validade"):
            if isinstance(licenca["data_validade"], str):
                data_validade = datetime.fromisoformat(licenca["data_validade"])
            else:
                data_validade = licenca["data_validade"]
            
            if data_validade.tzinfo is None:
                data_validade = data_validade.replace(tzinfo=timezone.utc)
            
            dias_restantes = (data_validade - datetime.now(timezone.utc)).days
            
            if dias_restantes < 0:
                licenca["status"] = "vencida"
            elif dias_restantes <= 30:
                licenca["status"] = "vencendo_30dias"
            else:
                licenca["status"] = "valida"
    
    return {
        "ultima_inspecao": ultima_inspecao,
        "inspecoes_historico": inspecoes,
        "alertas": alertas,
        "licencas": licencas
    }

# Licenças Routes
@api_router.post("/licencas", response_model=LicencaDocumento)
async def create_licenca(licenca_data: LicencaDocumentoCreate, request: Request):
    user = await get_current_user(request)
    
    licenca_id = f"lic_{uuid.uuid4().hex[:12]}"
    
    data_emissao = datetime.fromisoformat(licenca_data.data_emissao)
    if data_emissao.tzinfo is None:
        data_emissao = data_emissao.replace(tzinfo=timezone.utc)
    
    data_validade = datetime.fromisoformat(licenca_data.data_validade)
    if data_validade.tzinfo is None:
        data_validade = data_validade.replace(tzinfo=timezone.utc)
    
    dias_restantes = (data_validade - datetime.now(timezone.utc)).days
    
    if dias_restantes < 0:
        status = "vencida"
    elif dias_restantes <= licenca_data.dias_alerta_vencimento:
        status = "a_vencer"
    else:
        status = "valida"
    
    licenca_dict = {
        "licenca_id": licenca_id,
        "empresa_id": licenca_data.empresa_id,
        "nome_licenca": licenca_data.nome_licenca,
        "numero_licenca": licenca_data.numero_licenca,
        "tipo": licenca_data.tipo,
        "orgao_emissor": licenca_data.orgao_emissor,
        "data_emissao": data_emissao,
        "data_validade": data_validade,
        "dias_alerta_vencimento": licenca_data.dias_alerta_vencimento,
        "observacoes": licenca_data.observacoes or None,
        "arquivo_id": None,
        "status": status,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.licencas_documentos.insert_one(licenca_dict)
    licenca_doc = await db.licencas_documentos.find_one({"licenca_id": licenca_id}, {"_id": 0})
    return LicencaDocumento(**licenca_doc)

@api_router.get("/licencas", response_model=List[LicencaDocumento])
async def get_licencas(
    request: Request,
    empresa_id: Optional[str] = None,
    status: Optional[str] = None,
    tipo: Optional[str] = None
):
    user = await get_current_user(request)
    query = {}
    if empresa_id:
        query["empresa_id"] = empresa_id
    if status:
        query["status"] = status
    if tipo:
        query["tipo"] = tipo
    
    licencas = await db.licencas_documentos.find(query, {"_id": 0}).to_list(1000)
    
    for licenca in licencas:
        if licenca.get("data_validade"):
            data_validade = licenca["data_validade"]
            if isinstance(data_validade, str):
                data_validade = datetime.fromisoformat(data_validade)
            if data_validade.tzinfo is None:
                data_validade = data_validade.replace(tzinfo=timezone.utc)
            
            dias_restantes = (data_validade - datetime.now(timezone.utc)).days
            
            if dias_restantes < 0:
                licenca["status"] = "vencida"
            elif dias_restantes <= licenca.get("dias_alerta_vencimento", 30):
                licenca["status"] = "a_vencer"
            else:
                licenca["status"] = "valida"
    
    return licencas

@api_router.get("/licencas/{licenca_id}", response_model=LicencaDocumento)
async def get_licenca(licenca_id: str, request: Request):
    user = await get_current_user(request)
    licenca = await db.licencas_documentos.find_one({"licenca_id": licenca_id}, {"_id": 0})
    if not licenca:
        raise HTTPException(status_code=404, detail="Licença not found")
    return LicencaDocumento(**licenca)

@api_router.put("/licencas/{licenca_id}", response_model=LicencaDocumento)
async def update_licenca(licenca_id: str, licenca_data: LicencaDocumentoUpdate, request: Request):
    user = await get_current_user(request)
    
    update_dict = {k: v for k, v in licenca_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    if "data_emissao" in update_dict:
        update_dict["data_emissao"] = datetime.fromisoformat(update_dict["data_emissao"])
    if "data_validade" in update_dict:
        update_dict["data_validade"] = datetime.fromisoformat(update_dict["data_validade"])
    
    await db.licencas_documentos.update_one(
        {"licenca_id": licenca_id},
        {"$set": update_dict}
    )
    
    licenca_doc = await db.licencas_documentos.find_one({"licenca_id": licenca_id}, {"_id": 0})
    return LicencaDocumento(**licenca_doc)

@api_router.delete("/licencas/{licenca_id}")
async def delete_licenca(licenca_id: str, request: Request):
    user = await get_current_user(request)
    
    await db.condicionantes.delete_many({"licenca_id": licenca_id})
    
    result = await db.licencas_documentos.delete_one({"licenca_id": licenca_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Licença not found")
    return {"message": "Licença deleted"}

# Condicionantes Routes
@api_router.post("/licencas/{licenca_id}/condicionantes", response_model=Condicionante)
async def create_condicionante(licenca_id: str, condicionante_data: CondicionanteCreate, request: Request):
    user = await get_current_user(request)
    
    condicionante_id = f"cond_{uuid.uuid4().hex[:12]}"
    condicionante_dict = {
        "condicionante_id": condicionante_id,
        "licenca_id": licenca_id,
        **condicionante_data.model_dump(),
        "status": "em_andamento",
        "percentual_conclusao": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    condicionante_dict["data_acompanhamento"] = datetime.fromisoformat(condicionante_dict["data_acompanhamento"])
    condicionante_dict["alerta_acompanhamento"] = datetime.fromisoformat(condicionante_dict["alerta_acompanhamento"])
    
    await db.condicionantes.insert_one(condicionante_dict)
    condicionante_doc = await db.condicionantes.find_one({"condicionante_id": condicionante_id}, {"_id": 0})
    return Condicionante(**condicionante_doc)

@api_router.get("/condicionantes", response_model=List[Condicionante])
async def get_condicionantes(
    request: Request,
    licenca_id: Optional[str] = None,
    status: Optional[str] = None
):
    user = await get_current_user(request)
    query = {}
    if licenca_id:
        query["licenca_id"] = licenca_id
    if status:
        query["status"] = status
    
    condicionantes = await db.condicionantes.find(query, {"_id": 0}).to_list(1000)
    return condicionantes

@api_router.get("/condicionantes/{condicionante_id}", response_model=Condicionante)
async def get_condicionante(condicionante_id: str, request: Request):
    user = await get_current_user(request)
    condicionante = await db.condicionantes.find_one({"condicionante_id": condicionante_id}, {"_id": 0})
    if not condicionante:
        raise HTTPException(status_code=404, detail="Condicionante not found")
    return Condicionante(**condicionante)

@api_router.put("/condicionantes/{condicionante_id}", response_model=Condicionante)
async def update_condicionante(condicionante_id: str, condicionante_data: CondicionanteUpdate, request: Request):
    user = await get_current_user(request)
    
    update_dict = {k: v for k, v in condicionante_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    if "data_acompanhamento" in update_dict and update_dict["data_acompanhamento"]:
        update_dict["data_acompanhamento"] = datetime.fromisoformat(update_dict["data_acompanhamento"])
    if "alerta_acompanhamento" in update_dict and update_dict["alerta_acompanhamento"]:
        update_dict["alerta_acompanhamento"] = datetime.fromisoformat(update_dict["alerta_acompanhamento"])
    if "nova_data_acompanhamento" in update_dict and update_dict["nova_data_acompanhamento"]:
        update_dict["nova_data_acompanhamento"] = datetime.fromisoformat(update_dict["nova_data_acompanhamento"])
    
    await db.condicionantes.update_one(
        {"condicionante_id": condicionante_id},
        {"$set": update_dict}
    )
    
    condicionante_doc = await db.condicionantes.find_one({"condicionante_id": condicionante_id}, {"_id": 0})
    return Condicionante(**condicionante_doc)

@api_router.delete("/condicionantes/{condicionante_id}")
async def delete_condicionante(condicionante_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.condicionantes.delete_one({"condicionante_id": condicionante_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Condicionante not found")
    return {"message": "Condicionante deleted"}

# Indicadores/Dashboard de Licenças
@api_router.get("/licencas/indicadores/dashboard")
async def get_licencas_dashboard(request: Request, empresa_id: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {}
    if empresa_id:
        query["empresa_id"] = empresa_id
    
    licencas = await db.licencas_documentos.find(query, {"_id": 0}).to_list(1000)
    
    total = len(licencas)
    validas = 0
    a_vencer = 0
    vencidas = 0
    
    proximos_vencimentos = []
    
    for licenca in licencas:
        data_validade = licenca.get("data_validade")
        if data_validade:
            if isinstance(data_validade, str):
                data_validade = datetime.fromisoformat(data_validade)
            if data_validade.tzinfo is None:
                data_validade = data_validade.replace(tzinfo=timezone.utc)
            
            dias_restantes = (data_validade - datetime.now(timezone.utc)).days
            
            if dias_restantes < 0:
                vencidas += 1
                licenca["status"] = "vencida"
            elif dias_restantes <= 180:
                a_vencer += 1
                licenca["status"] = "a_vencer"
                proximos_vencimentos.append({
                    "licenca_id": licenca["licenca_id"],
                    "nome_licenca": licenca["nome_licenca"],
                    "empresa_id": licenca["empresa_id"],
                    "data_validade": data_validade.isoformat(),
                    "dias_restantes": dias_restantes
                })
            else:
                validas += 1
                licenca["status"] = "valida"
    
    proximos_vencimentos.sort(key=lambda x: x["dias_restantes"])
    
    por_tipo = {}
    for licenca in licencas:
        tipo = licenca.get("tipo", "Outros")
        if tipo not in por_tipo:
            por_tipo[tipo] = 0
        por_tipo[tipo] += 1
    
    return {
        "total": total,
        "validas": validas,
        "a_vencer": a_vencer,
        "vencidas": vencidas,
        "proximos_vencimentos": proximos_vencimentos[:10],
        "por_tipo": por_tipo,
        "licencas": licencas
    }

@api_router.get("/licencas/{empresa_id}", response_model=List[LicencaDocumento])
async def get_licencas_old(empresa_id: str, request: Request):
    user = await get_current_user(request)
    licencas = await db.licencas_documentos.find(
        {"empresa_id": empresa_id},
        {"_id": 0}
    ).to_list(100)
    return licencas

@api_router.post("/licencas/{empresa_id}", response_model=LicencaDocumento)
async def create_licenca_old(
    empresa_id: str,
    licenca_data: LicencaDocumentoCreate,
    request: Request
):
    user = await get_current_user(request)
    
    licenca_id = f"lic_{uuid.uuid4().hex[:12]}"
    licenca_dict = {
        "licenca_id": licenca_id,
        "empresa_id": empresa_id,
        **licenca_data.model_dump(),
        "created_at": datetime.now(timezone.utc)
    }
    
    if licenca_dict.get("data_emissao"):
        licenca_dict["data_emissao"] = datetime.fromisoformat(licenca_dict["data_emissao"])
    if licenca_dict.get("data_validade"):
        licenca_dict["data_validade"] = datetime.fromisoformat(licenca_dict["data_validade"])
    
    await db.licencas_documentos.insert_one(licenca_dict)
    licenca_doc = await db.licencas_documentos.find_one({"licenca_id": licenca_id}, {"_id": 0})
    return LicencaDocumento(**licenca_doc)

@api_router.get("/alertas/{inspecao_id}", response_model=List[Alerta])
async def get_alertas(inspecao_id: str, request: Request):
    user = await get_current_user(request)
    alertas = await db.alertas.find({"inspecao_id": inspecao_id}, {"_id": 0}).to_list(100)
    return alertas

@api_router.put("/alertas/{alerta_id}/status")
async def update_alerta_status(alerta_id: str, status: str, request: Request):
    user = await get_current_user(request)
    await db.alertas.update_one(
        {"alerta_id": alerta_id},
        {"$set": {"status": status}}
    )
    alerta_doc = await db.alertas.find_one({"alerta_id": alerta_id}, {"_id": 0})
    return alerta_doc

# Tickets Routes
@api_router.get("/tickets")
async def get_tickets(request: Request):
    user = await get_current_user(request)
    
    if is_gestor(user):
        # Gestor vê todos os tickets (incluindo excluídos pelo cliente)
        tickets = await db.tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        # Cliente vê apenas seus tickets que não foram excluídos
        tickets = await db.tickets.find({
            "user_id": user.user_id,
            "$or": [{"deleted_by_client": {"$exists": False}}, {"deleted_by_client": False}]
        }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enriquecer com dados da empresa e planta
    for ticket in tickets:
        empresa = await db.empresas.find_one({"empresa_id": ticket["empresa_id"]}, {"_id": 0})
        planta = await db.plantas_estabelecimento.find_one({"planta_id": ticket["planta_id"]}, {"_id": 0})
        ticket["empresa"] = empresa
        ticket["planta"] = planta
    
    return tickets

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Verificar permissão
    if not is_gestor(user) and ticket["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Buscar mensagens
    mensagens = await db.ticket_mensagens.find(
        {"ticket_id": ticket_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Buscar áreas (se existirem)
    areas = await db.areas_criticas.find(
        {"planta_id": ticket["planta_id"]},
        {"_id": 0}
    ).to_list(100)
    
    empresa = await db.empresas.find_one({"empresa_id": ticket["empresa_id"]}, {"_id": 0})
    planta = await db.plantas_estabelecimento.find_one({"planta_id": ticket["planta_id"]}, {"_id": 0})
    
    return {
        **ticket,
        "mensagens": mensagens,
        "areas": areas,
        "empresa": empresa,
        "planta": planta
    }

@api_router.post("/tickets/{ticket_id}/mensagem")
async def add_ticket_mensagem(ticket_id: str, mensagem: str, tipo: str, request: Request):
    user = await get_current_user(request)
    
    mensagem_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_role = "gestor" if is_gestor(user) else "cliente"
    
    await db.ticket_mensagens.insert_one({
        "mensagem_id": mensagem_id,
        "ticket_id": ticket_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_role": user_role,
        "mensagem": mensagem,
        "tipo": tipo,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Mensagem adicionada"}

@api_router.put("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, status: str, etapa: str, request: Request):
    user = await get_current_user(request)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Apenas gestor pode mudar certos status
    if etapa in ["aguardando_fotos_cliente", "concluido"] and not is_gestor(user):
        raise HTTPException(status_code=403, detail="Apenas gestores podem alterar este status")
    
    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "status": status,
            "etapa": etapa,
            "updated_at": datetime.now(timezone.utc),
            "closed_at": datetime.now(timezone.utc) if etapa == "finalizado" else None
        }}
    )
    
    # Registrar mudança de status
    mensagem_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_role = "gestor" if is_gestor(user) else "cliente"
    
    status_map = {
        "mapeamento_gestor": "Aguardando mapeamento das áreas pelo gestor",
        "upload_fotos_cliente": "Áreas mapeadas. Aguardando upload de fotos pelo cliente",
        "analise_gestor": "Fotos enviadas. Aguardando análise do gestor",
        "finalizado": "Ticket concluído. Relatório disponível"
    }
    
    mensagem_texto = status_map.get(etapa, f"Status alterado para: {status}")
    
    await db.ticket_mensagens.insert_one({
        "mensagem_id": mensagem_id,
        "ticket_id": ticket_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_role": user_role,
        "mensagem": mensagem_texto,
        "tipo": "status_change",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Enviar emails de notificação
    cliente_email = ticket["user_email"]
    
    if etapa == "upload_fotos_cliente":
        # Gestor mapeou áreas, notificar cliente
        await enviar_email_notificacao(
            cliente_email,
            f"Atualização Ticket #{ticket_id[-8:]} - EcoGuard",
            f"Seu ticket foi atualizado. As áreas críticas foram mapeadas. Acesse o sistema para enviar as fotos solicitadas."
        )
    elif etapa == "analise_gestor":
        # Cliente enviou fotos, notificar gestor
        await enviar_email_notificacao(
            GESTORES_EMAILS[0],
            f"Atualização Ticket #{ticket_id[-8:]} - EcoGuard",
            f"O cliente {cliente_email} enviou as fotos. Acesse o sistema para análise."
        )
    elif etapa == "finalizado":
        # Gestor finalizou, notificar cliente
        await enviar_email_notificacao(
            cliente_email,
            f"Ticket #{ticket_id[-8:]} Concluído - EcoGuard",
            f"Seu ticket foi concluído. O relatório está disponível no sistema."
        )
    
    return {"message": "Status atualizado"}

@api_router.post("/tickets/{ticket_id}/upload-foto")
async def upload_foto_area(
    ticket_id: str,
    area_id: str = Form(...),
    foto: UploadFile = File(...),
    request: Request = None
):
    user = await get_current_user(request)
    
    # Cliente envia foto
    file_content = await foto.read()
    file_id = await fs.upload_from_stream(
        foto.filename,
        io.BytesIO(file_content),
        metadata={"content_type": foto.content_type}
    )
    
    # Salvar foto na área
    await db.areas_criticas.update_one(
        {"area_id": area_id},
        {"$set": {"foto_cliente_id": str(file_id)}}
    )
    
    return {"message": "Foto enviada com sucesso", "foto_id": str(file_id)}

@api_router.post("/tickets/{ticket_id}/analise-area")
async def analisar_area_gestor(
    ticket_id: str,
    area_id: str = Form(...),
    situacao: str = Form(...),  # conforme, nao_conforme, nao_aplicavel
    observacao: str = Form(None),
    request: Request = None
):
    user = await get_current_user(request)
    
    if not is_gestor(user):
        raise HTTPException(status_code=403, detail="Apenas gestores podem analisar")
    
    # Gestor analisa a foto enviada pelo cliente
    await db.areas_criticas.update_one(
        {"area_id": area_id},
        {"$set": {
            "situacao_gestor": situacao,
            "observacao_gestor": observacao,
            "analisado_em": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Análise registrada"}

@api_router.get("/tickets/{ticket_id}/pode-criar-novo")
async def pode_criar_novo_ticket(empresa_id: str, request: Request):
    user = await get_current_user(request)
    
    # Verificar se há tickets não finalizados
    ticket_aberto = await db.tickets.find_one({
        "empresa_id": empresa_id,
        "etapa": {"$ne": "finalizado"}
    }, {"_id": 0})
    
    return {"pode_criar": ticket_aberto is None, "ticket_aberto": ticket_aberto}

@api_router.get("/areas/{area_id}/foto-cliente")
async def get_foto_cliente(area_id: str, request: Request):
    """Retorna a foto enviada pelo cliente para uma área crítica"""
    user = await get_current_user(request)
    
    area = await db.areas_criticas.find_one({"area_id": area_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")
    
    if not area.get("foto_cliente_id"):
        raise HTTPException(status_code=404, detail="Foto não encontrada")
    
    from bson import ObjectId
    try:
        file_stream = await fs.open_download_stream(ObjectId(area["foto_cliente_id"]))
        file_content = await file_stream.read()
        return Response(content=file_content, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

@api_router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, request: Request):
    """Exclui um ticket. Para cliente, marca como excluído. Para gestor, exclui definitivamente."""
    user = await get_current_user(request)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    
    # Verificar permissão
    if not is_gestor(user) and ticket["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Sem permissão para excluir este ticket")
    
    if is_gestor(user):
        # Gestor pode excluir definitivamente
        await db.tickets.delete_one({"ticket_id": ticket_id})
        await db.ticket_mensagens.delete_many({"ticket_id": ticket_id})
        return {"message": "Ticket excluído definitivamente"}
    else:
        # Cliente apenas marca como excluído (gestor ainda vê)
        await db.tickets.update_one(
            {"ticket_id": ticket_id},
            {"$set": {"deleted_by_client": True, "deleted_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Ticket excluído"}

@api_router.get("/tickets/{ticket_id}/relatorio")
async def get_relatorio_ticket(ticket_id: str, request: Request):
    """Gera relatório PDF do ticket finalizado"""
    user = await get_current_user(request)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    
    # Verificar permissão
    if not is_gestor(user) and ticket["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    # Buscar dados completos
    empresa = await db.empresas.find_one({"empresa_id": ticket["empresa_id"]}, {"_id": 0})
    planta = await db.plantas_estabelecimento.find_one({"planta_id": ticket["planta_id"]}, {"_id": 0})
    areas = await db.areas_criticas.find({"planta_id": ticket["planta_id"]}, {"_id": 0}).to_list(100)
    mensagens = await db.ticket_mensagens.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    # Contabilizar análises
    total_areas = len(areas)
    conformes = len([a for a in areas if a.get("situacao_gestor") == "conforme"])
    nao_conformes = len([a for a in areas if a.get("situacao_gestor") == "nao_conforme"])
    nao_aplicaveis = len([a for a in areas if a.get("situacao_gestor") == "nao_aplicavel"])
    
    # Gerar HTML do relatório
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Relatório - Ticket #{ticket_id[-8:]}</title>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 40px; color: #333; }}
            .header {{ text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }}
            .header h1 {{ color: #16a34a; margin: 0; }}
            .header p {{ color: #666; margin: 5px 0; }}
            .section {{ margin-bottom: 30px; }}
            .section h2 {{ color: #16a34a; border-bottom: 1px solid #ddd; padding-bottom: 10px; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
            .info-item {{ background: #f9f9f9; padding: 10px; border-radius: 5px; }}
            .info-item strong {{ color: #333; }}
            .area-card {{ border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; }}
            .area-card.conforme {{ border-left: 4px solid #16a34a; }}
            .area-card.nao_conforme {{ border-left: 4px solid #dc2626; }}
            .area-card.nao_aplicavel {{ border-left: 4px solid #9ca3af; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .badge.conforme {{ background: #dcfce7; color: #16a34a; }}
            .badge.nao_conforme {{ background: #fee2e2; color: #dc2626; }}
            .badge.nao_aplicavel {{ background: #f3f4f6; color: #6b7280; }}
            .summary {{ display: flex; gap: 20px; justify-content: center; margin: 20px 0; }}
            .summary-item {{ text-align: center; padding: 15px 25px; border-radius: 8px; }}
            .summary-item.green {{ background: #dcfce7; }}
            .summary-item.red {{ background: #fee2e2; }}
            .summary-item.gray {{ background: #f3f4f6; }}
            .summary-item .number {{ font-size: 32px; font-weight: bold; }}
            .summary-item .label {{ font-size: 12px; color: #666; }}
            .footer {{ text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌿 EcoGuard</h1>
            <p>Relatório de Auto-Fiscalização Ambiental</p>
            <p><strong>Ticket #{ticket_id[-8:]}</strong></p>
        </div>
        
        <div class="section">
            <h2>Dados da Empresa</h2>
            <div class="info-grid">
                <div class="info-item"><strong>Empresa:</strong> {empresa.get('nome', 'N/A') if empresa else 'N/A'}</div>
                <div class="info-item"><strong>CNPJ:</strong> {empresa.get('cnpj', 'N/A') if empresa else 'N/A'}</div>
                <div class="info-item"><strong>Endereço:</strong> {empresa.get('endereco', 'N/A') if empresa else 'N/A'}</div>
                <div class="info-item"><strong>Responsável:</strong> {empresa.get('responsavel', 'N/A') if empresa else 'N/A'}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Resumo da Inspeção</h2>
            <div class="summary">
                <div class="summary-item green">
                    <div class="number">{conformes}</div>
                    <div class="label">CONFORMES</div>
                </div>
                <div class="summary-item red">
                    <div class="number">{nao_conformes}</div>
                    <div class="label">NÃO CONFORMES</div>
                </div>
                <div class="summary-item gray">
                    <div class="number">{nao_aplicaveis}</div>
                    <div class="label">NÃO APLICÁVEIS</div>
                </div>
            </div>
            <div class="info-grid">
                <div class="info-item"><strong>Data de Abertura:</strong> {ticket.get('created_at').strftime('%d/%m/%Y') if ticket.get('created_at') else 'N/A'}</div>
                <div class="info-item"><strong>Data de Conclusão:</strong> {ticket.get('closed_at').strftime('%d/%m/%Y') if ticket.get('closed_at') else 'N/A'}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Análise por Área ({total_areas} áreas)</h2>
            {''.join([f'''
            <div class="area-card {a.get('situacao_gestor', 'pendente')}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>{a.get('nome', 'Área')}</strong>
                    <span class="badge {a.get('situacao_gestor', 'pendente')}">
                        {'✓ Conforme' if a.get('situacao_gestor') == 'conforme' else '✗ Não Conforme' if a.get('situacao_gestor') == 'nao_conforme' else '— Não Aplicável' if a.get('situacao_gestor') == 'nao_aplicavel' else 'Pendente'}
                    </span>
                </div>
                <p style="margin: 10px 0 5px;"><strong>Tipo:</strong> {a.get('tipo_area', 'N/A')}</p>
                <p style="margin: 5px 0;"><strong>Criticidade:</strong> {a.get('criticidade', 'N/A').upper()}</p>
                {f'<p style="margin: 5px 0;"><strong>Observação:</strong> {a.get("observacao_gestor")}</p>' if a.get('observacao_gestor') else ''}
            </div>
            ''' for a in areas])}
        </div>
        
        <div class="footer">
            <p>Relatório gerado automaticamente pelo sistema EcoGuard</p>
            <p>Este documento é parte integrante do processo de auto-fiscalização ambiental</p>
        </div>
    </body>
    </html>
    """
    
    return Response(
        content=html_content.encode('utf-8'),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=relatorio_ticket_{ticket_id[-8:]}.html"}
    )

# ========================================
# Sistema de Alertas Automáticos
# ========================================

async def verificar_licencas_vencendo():
    """Verifica licenças próximas do vencimento e envia alertas por email"""
    try:
        logger.info("🔔 Iniciando verificação de licenças...")
        
        # Buscar todas as licenças
        licencas = await db.licencas_documentos.find({}, {"_id": 0}).to_list(1000)
        alertas_enviados = 0
        
        for licenca in licencas:
            data_validade = licenca.get("data_validade")
            if not data_validade:
                continue
                
            if isinstance(data_validade, str):
                data_validade = datetime.fromisoformat(data_validade)
            if data_validade.tzinfo is None:
                data_validade = data_validade.replace(tzinfo=timezone.utc)
            
            dias_restantes = (data_validade - datetime.now(timezone.utc)).days
            dias_alerta = licenca.get("dias_alerta_vencimento", 30)
            
            # Verificar se já enviamos alerta hoje para esta licença
            alerta_key = f"{licenca['licenca_id']}_{datetime.now(timezone.utc).date()}"
            alerta_existente = await db.alertas_enviados.find_one({"alerta_key": alerta_key})
            
            if alerta_existente:
                continue  # Já enviamos alerta hoje
            
            # Determinar se precisa enviar alerta
            deve_alertar = False
            tipo_alerta = ""
            
            if dias_restantes < 0:
                deve_alertar = True
                tipo_alerta = "VENCIDA"
            elif dias_restantes <= 7:
                deve_alertar = True
                tipo_alerta = "CRÍTICO"
            elif dias_restantes <= dias_alerta:
                deve_alertar = True
                tipo_alerta = "ATENÇÃO"
            
            if deve_alertar:
                # Buscar empresa para obter dados de contato
                empresa = await db.empresas.find_one(
                    {"empresa_id": licenca["empresa_id"]}, 
                    {"_id": 0}
                )
                
                # Buscar usuário dono da empresa
                if empresa:
                    user = await db.users.find_one(
                        {"user_id": empresa.get("user_id")},
                        {"_id": 0}
                    )
                    
                    if user and user.get("email"):
                        # Montar mensagem de alerta
                        if dias_restantes < 0:
                            mensagem = f"""
                            <strong style="color: #dc2626;">⚠️ LICENÇA VENCIDA!</strong><br><br>
                            A licença <strong>{licenca['nome_licenca']}</strong> ({licenca['numero_licenca']}) 
                            da empresa <strong>{empresa['nome']}</strong> está <strong>VENCIDA há {abs(dias_restantes)} dias</strong>.<br><br>
                            <strong>Tipo:</strong> {licenca['tipo']}<br>
                            <strong>Órgão Emissor:</strong> {licenca['orgao_emissor']}<br>
                            <strong>Vencimento:</strong> {data_validade.strftime('%d/%m/%Y')}<br><br>
                            Providencie a renovação imediatamente para evitar multas e sanções.
                            """
                        else:
                            mensagem = f"""
                            A licença <strong>{licenca['nome_licenca']}</strong> ({licenca['numero_licenca']}) 
                            da empresa <strong>{empresa['nome']}</strong> vencerá em <strong>{dias_restantes} dias</strong>.<br><br>
                            <strong>Tipo:</strong> {licenca['tipo']}<br>
                            <strong>Órgão Emissor:</strong> {licenca['orgao_emissor']}<br>
                            <strong>Vencimento:</strong> {data_validade.strftime('%d/%m/%Y')}<br><br>
                            Providencie a renovação com antecedência para evitar problemas.
                            """
                        
                        assunto = f"[{tipo_alerta}] Licença {licenca['nome_licenca']} - {dias_restantes} dias para vencer" if dias_restantes >= 0 else f"[VENCIDA] Licença {licenca['nome_licenca']} - AÇÃO URGENTE"
                        
                        # Enviar email
                        await enviar_email_notificacao(user["email"], assunto, mensagem)
                        
                        # Também notificar gestor
                        await enviar_email_notificacao(GESTORES_EMAILS[0], assunto, mensagem)
                        
                        # Registrar que enviamos o alerta
                        await db.alertas_enviados.insert_one({
                            "alerta_key": alerta_key,
                            "licenca_id": licenca["licenca_id"],
                            "tipo_alerta": tipo_alerta,
                            "dias_restantes": dias_restantes,
                            "enviado_em": datetime.now(timezone.utc)
                        })
                        
                        alertas_enviados += 1
                        logger.info(f"📧 Alerta enviado: {licenca['nome_licenca']} ({tipo_alerta})")
        
        # Verificar condicionantes também
        condicionantes = await db.condicionantes.find({}, {"_id": 0}).to_list(1000)
        
        for cond in condicionantes:
            data_acompanhamento = cond.get("data_acompanhamento")
            if not data_acompanhamento:
                continue
                
            if isinstance(data_acompanhamento, str):
                data_acompanhamento = datetime.fromisoformat(data_acompanhamento)
            if data_acompanhamento.tzinfo is None:
                data_acompanhamento = data_acompanhamento.replace(tzinfo=timezone.utc)
            
            dias_restantes = (data_acompanhamento - datetime.now(timezone.utc)).days
            
            # Verificar se já enviamos alerta hoje
            alerta_key = f"cond_{cond['condicionante_id']}_{datetime.now(timezone.utc).date()}"
            alerta_existente = await db.alertas_enviados.find_one({"alerta_key": alerta_key})
            
            if alerta_existente:
                continue
            
            if dias_restantes <= 7 and dias_restantes >= 0:
                # Buscar licença associada
                licenca = await db.licencas_documentos.find_one(
                    {"licenca_id": cond["licenca_id"]},
                    {"_id": 0}
                )
                
                if licenca and cond.get("responsavel_email"):
                    mensagem = f"""
                    A condicionante <strong>{cond['nome']}</strong> da licença <strong>{licenca['nome_licenca']}</strong> 
                    tem prazo de acompanhamento em <strong>{dias_restantes} dias</strong>.<br><br>
                    <strong>Descrição:</strong> {cond['descricao']}<br>
                    <strong>Data:</strong> {data_acompanhamento.strftime('%d/%m/%Y')}<br>
                    <strong>Responsável:</strong> {cond['responsavel_nome']}<br><br>
                    Verifique o cumprimento desta condicionante.
                    """
                    
                    assunto = f"[CONDICIONANTE] {cond['nome']} - Prazo em {dias_restantes} dias"
                    
                    await enviar_email_notificacao(cond["responsavel_email"], assunto, mensagem)
                    await enviar_email_notificacao(GESTORES_EMAILS[0], assunto, mensagem)
                    
                    await db.alertas_enviados.insert_one({
                        "alerta_key": alerta_key,
                        "condicionante_id": cond["condicionante_id"],
                        "tipo_alerta": "CONDICIONANTE",
                        "dias_restantes": dias_restantes,
                        "enviado_em": datetime.now(timezone.utc)
                    })
                    
                    alertas_enviados += 1
        
        logger.info(f"✅ Verificação concluída. {alertas_enviados} alertas enviados.")
        return alertas_enviados
        
    except Exception as e:
        logger.error(f"Erro na verificação de licenças: {e}")
        return 0

async def scheduler_alertas():
    """Scheduler que roda a cada hora verificando alertas"""
    while True:
        try:
            await verificar_licencas_vencendo()
        except Exception as e:
            logger.error(f"Erro no scheduler de alertas: {e}")
        
        # Aguardar 1 hora antes da próxima verificação
        await asyncio.sleep(3600)

# Endpoint manual para disparar verificação
@api_router.post("/alertas/verificar")
async def verificar_alertas_manual(request: Request):
    """Dispara verificação manual de alertas (apenas gestor)"""
    user = await get_current_user(request)
    
    if not is_gestor(user):
        raise HTTPException(status_code=403, detail="Apenas gestores podem disparar verificação")
    
    alertas_enviados = await verificar_licencas_vencendo()
    return {"message": f"Verificação concluída. {alertas_enviados} alertas enviados."}

# Endpoint para listar alertas enviados
@api_router.get("/alertas/historico")
async def get_historico_alertas(request: Request, dias: int = 30):
    """Retorna histórico de alertas enviados"""
    user = await get_current_user(request)
    
    alertas_cursor = db.alertas_enviados.find({}, {"_id": 0}).sort("enviado_em", -1)
    alertas = await alertas_cursor.to_list(500)
    
    # Converter datas para serialização JSON
    for alerta in alertas:
        if "enviado_em" in alerta and isinstance(alerta["enviado_em"], datetime):
            alerta["enviado_em"] = alerta["enviado_em"].isoformat()
    
    return alertas

# Endpoint para configurações de alerta por licença
@api_router.put("/licencas/{licenca_id}/alerta")
async def update_alerta_config(licenca_id: str, dias_alerta: int, request: Request):
    """Atualiza dias de antecedência para alerta de vencimento"""
    user = await get_current_user(request)
    
    if dias_alerta < 1 or dias_alerta > 180:
        raise HTTPException(status_code=400, detail="Dias de alerta deve ser entre 1 e 180")
    
    await db.licencas_documentos.update_one(
        {"licenca_id": licenca_id},
        {"$set": {"dias_alerta_vencimento": dias_alerta}}
    )
    
    return {"message": f"Alerta configurado para {dias_alerta} dias antes do vencimento"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Inicia o scheduler de alertas ao iniciar a aplicação"""
    logger.info("🚀 EcoGuard iniciado!")
    # Iniciar scheduler de alertas em background
    asyncio.create_task(scheduler_alertas())
    logger.info("📅 Scheduler de alertas automáticos iniciado (verifica a cada hora)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()