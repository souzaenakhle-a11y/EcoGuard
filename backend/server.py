# ADICIONAR ANTES DA LINHA 'app.include_router(api_router)'

# Admin - Gerenciamento de Usuários
@api_router.get("/admin/users")
async def get_all_users(request: Request):
    """Lista todos os usuários (apenas gestor)"""
    user = await get_current_user(request)
    
    if not is_gestor(user):
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    # Buscar todos usuários
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    # Enriquecer com dados adicionais
    for u in users:
        # Buscar empresas do usuário
        empresas = await db.empresas.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(100)
        u["empresas"] = empresas
        
        # Buscar última sessão
        last_session = await db.user_sessions.find_one(
            {"user_id": u["user_id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        u["last_login"] = last_session["created_at"] if last_session else None
        
        # Contar tickets
        tickets_count = await db.tickets.count_documents({"user_id": u["user_id"]})
        u["tickets_count"] = tickets_count
    
    return users

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, request: Request):
    """Exclui usuário e todos seus dados (apenas gestor)"""
    user = await get_current_user(request)
    
    if not is_gestor(user):
        raise HTTPException(status_code=403, detail="Apenas administradores")
    
    # Não permitir auto-exclusão
    if user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Não pode excluir a si mesmo")
    
    # Excluir dados relacionados
    await db.empresas.delete_many({"user_id": user_id})
    await db.tickets.delete_many({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.clientes.delete_many({"user_id": user_id})
    
    # Excluir usuário
    result = await db.users.delete_one({"user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {"message": "Usuário excluído com sucesso"}