from database import db
import json
from sqlalchemy.ext import mutable
from sqlalchemy import JSON, func

class JsonEncodedDict(db.TypeDecorator):
    """Enables JSON storage by encoding and decoding on the fly."""
    impl = db.Text

    def process_bind_param(self, value, dialect):
        if value is None:
            return '{}'
        else:
            return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return {}
        else:
            return json.loads(value)
mutable.MutableDict.associate_with(JsonEncodedDict)


class Checklist(db.Model):
    __tablename__ = 'template_core_checklist'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class Occurrence(db.Model):
    __tablename__ = 'template_core_occurrence'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class Samplingevent(db.Model):
    __tablename__ = 'template_core_samplingevent'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class Others(db.Model):
    __tablename__ = 'template_core_others'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data
    
class ExtensionOccurrence(db.Model):
    __tablename__ = 'template_extension_occurrence'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class SimpleMultimedia(db.Model):
    __tablename__ = 'template_extension_simple_multimedia'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class ExtendedMeasurementOrFacts(db.Model):
    __tablename__ = 'template_extension_extended_measurement_or_facts'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class ResourceRelationship(db.Model):
    __tablename__ = 'template_extension_resource_relationship'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class DnaDerivedData(db.Model):
    __tablename__ = 'template_extension_dna_derived_data'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class EcologicalSurvey(db.Model):
    __tablename__ = 'template_theme_ecological_survey'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class Parasite(db.Model):
    __tablename__ = 'template_theme_parasite'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class Ltser(db.Model):
    __tablename__ = 'template_theme_ltser'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    definition_zh = db.Column(db.Text)
    common_name = db.Column(db.String)
    example = db.Column(db.Text)
    is_required = db.Column(db.Boolean, default=False)
    is_recommended = db.Column(db.Boolean, default=False)
    last_updated = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return f'{self.column_name}: {self.definition_zh}'
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data
    
class CustomTemplates(db.Model):
    __tablename__ = 'template_custom'

    id = db.Column(db.Integer, primary_key=True)
    template_title = db.Column(db.String, nullable=False)
    template_content = db.Column(JsonEncodedDict, nullable=False)
    last_updated = db.Column(db.Date, nullable=False)
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data
    
class CustomTerms(db.Model):
    __tablename__ = 'terms_custom'

    id = db.Column(db.Integer, primary_key=True)
    column_name = db.Column(db.String, nullable=False)
    column_type = db.Column(db.String)
    column_comment = db.Column(db.Text)
    last_edited = db.Column(db.Date, nullable=False)
    
    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data
    
class Projects(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String, nullable=False)
    table_content = db.Column(JsonEncodedDict)
    last_updated = db.Column(db.Date, nullable=False)

    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data
    
class ErrorMessages(db.Model):
    __tablename__ = 'error_messages'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.String, nullable=False)
    content = db.Column(JsonEncodedDict)

    def as_dict(self):
        data = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return data

class DynamicTable(db.Model):
    __tablename__ = 'dynamic_table'
    
    id = db.Column(db.Integer, primary_key=True)
    row_id = db.Column(db.Integer, nullable=False)
    table_id = db.Column(db.Integer, nullable=False)
    data = db.Column(JSON, nullable=False)  
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

class TableHeader(db.Model):
    __tablename__ = 'table_header'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    table_name = db.Column(db.String, nullable=False)  
    table_header = db.Column(JSON, nullable=False)       

    project = db.relationship('Projects', backref=db.backref('table_headers', lazy=True, cascade='all, delete-orphan'))

    @classmethod
    def get_table_headers(cls, project_id):
        headers_data = {}
        table_header_entries = cls.query.filter_by(project_id=project_id).all()
        
        for entry in table_header_entries:
            headers_data[entry.table_name] = {"checkbox_names": entry.table_header}
        
        return headers_data
    
    @classmethod
    def get_template_names(cls, project_id):
        template_names = {
            '資料集類型': [],
            '延伸資料集': []
        }
        table_header_entries = cls.query.filter_by(project_id=project_id).all()
        
        for entry in table_header_entries:
            table_name = entry.table_name
            if table_name in ['checklist', 'occurrence', 'samplingevent', 'others']:
                template_names['資料集類型'].append(table_name)
            else:
                template_names['延伸資料集'].append(table_name)
        
        return template_names

class TableData(db.Model):
    __tablename__ = 'table_data'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    table_id = db.Column(db.Integer, db.ForeignKey('table_header.id'), nullable=False)
    table_name = db.Column(db.String, nullable=False)
    row_id = db.Column(db.Integer, nullable=False)
    data = db.Column(JSON, nullable=False)     

    project = db.relationship('Projects', backref=db.backref('data_rows', lazy=True, cascade='all, delete-orphan'))
    header = db.relationship('TableHeader', backref=db.backref('data_entries', lazy=True, cascade='all, delete-orphan'))

