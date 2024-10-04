from database import db
import json
from sqlalchemy.ext import mutable

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
