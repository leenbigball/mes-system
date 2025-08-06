from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    WORKER = "worker"
    INSPECTOR = "inspector"

class MaterialType(str, enum.Enum):
    RAW_MATERIAL = "raw_material"
    SEMI_FINISHED = "semi_finished"
    FINISHED_GOOD = "finished_good"

class ProductionLineStatus(str, enum.Enum):
    IDLE = "idle"
    BUSY = "busy"

class WorkOrderStatus(str, enum.Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TaskStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    name = Column(String)
    created_at = Column(DateTime, server_default=func.now())

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(Enum(MaterialType), nullable=False)
    stock = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class ProductionLine(Base):
    __tablename__ = "production_lines"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(Enum(ProductionLineStatus), default=ProductionLineStatus.IDLE)
    created_at = Column(DateTime, server_default=func.now())

class Routing(Base):
    __tablename__ = "routings"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    finished_product_id = Column(String, ForeignKey("materials.id"))
    operations = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    finished_product = relationship("Material")

class BOM(Base):
    __tablename__ = "boms"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    routing_id = Column(String, ForeignKey("routings.id"))
    components = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    routing = relationship("Routing")

class WorkOrder(Base):
    __tablename__ = "work_orders"
    
    id = Column(String, primary_key=True)
    bom_id = Column(String, ForeignKey("boms.id"))
    planned_quantity = Column(Integer, nullable=False)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.CREATED)
    operations = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    bom = relationship("BOM")

class ProductionTask(Base):
    __tablename__ = "production_tasks"
    
    id = Column(String, primary_key=True)
    work_order_id = Column(String, ForeignKey("work_orders.id"))
    operation_index = Column(Integer, nullable=False)
    operation_name = Column(String, nullable=False)
    planned_output = Column(Integer, nullable=False)
    completed_output = Column(Integer, default=0)
    production_line_id = Column(String, ForeignKey("production_lines.id"))
    assigned_worker = Column(String, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.NOT_STARTED)
    material_feeding = Column(JSON)
    material_requirements = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    work_order = relationship("WorkOrder")
    production_line = relationship("ProductionLine")

class InspectionTask(Base):
    __tablename__ = "inspection_tasks"
    
    id = Column(String, primary_key=True)
    work_order_id = Column(String, ForeignKey("work_orders.id"))
    operation_index = Column(Integer, nullable=False)
    operation_name = Column(String, nullable=False)
    total_quantity = Column(Integer, nullable=False)
    qualified_quantity = Column(Integer, default=0)
    unqualified_quantity = Column(Integer, default=0)
    status = Column(Enum(TaskStatus), default=TaskStatus.NOT_STARTED)
    assigned_inspector = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    work_order = relationship("WorkOrder")

class Session(Base):
    __tablename__ = "sessions"
    
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User")
