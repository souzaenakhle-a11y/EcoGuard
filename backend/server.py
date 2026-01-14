from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from datetime import datetime, timezone, timedelta
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import gridfs
import io
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    cliente_id: str
    user_id: str
    nome: str
    cnpj: str
    setor: str
    endereco: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class EmpresaCreate(BaseModel):
    cliente_id: str
    nome: str
    cnpj: str
    setor: str
    endereco: Optional[str] = None

class PlantaEstabelecimento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    planta_id: str
    empresa_id: str
    nome: str
    arquivo_id: str
    tipo_arquivo: str
    status: str = "aguardando_marcacao"
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
    planta_doc = await db.plantas_estabelecimento.find_one({"planta_id": planta_id}, {"_id": 0})
    return planta_doc

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
@api_router.post("/licencas/{empresa_id}", response_model=LicencaDocumento)
async def create_licenca(
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

@api_router.get("/licencas/{empresa_id}", response_model=List[LicencaDocumento])
async def get_licencas(empresa_id: str, request: Request):
    user = await get_current_user(request)
    licencas = await db.licencas_documentos.find(
        {"empresa_id": empresa_id},
        {"_id": 0}
    ).to_list(100)
    return licencas

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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()