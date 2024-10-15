from importlib import import_module
from pandas import DataFrame

from data_parser import cross_validation, get_XY

class ModelTrainer():
    ml_framework_key = {'scikit-learn': 'SKLearnTrainer'}

    def __init__(self, model_specification: dict, df_dataset: DataFrame):
        self.model_specification = model_specification
        self.df_dataset = df_dataset

    
    def train_model(self):
        model_framework = self.build_model()

        dataset = cross_validation(self.df_dataset, self.model_specification['crossValidation'])

        model_framework.train(dataset)

        # NOTE:: Need to figure out what to do with these evaluation metrics.
        # I'm thinking a pandas df with a column for each metric. Will need to 
        # be visualized in some way on the frontend
        score = model_framework.evaluate(dataset)

        return score


    def build_model(self):
        model_framework = self.ml_framework_factory(self.model_specification.ml_framework, 
                                          self.model_specification.model_algorithm, 
                                          self.model_specification.prediction_problem, 
                                          self.model_specification.model_params)

        model_framework.build()


        return model_framework

    
    def ml_framework_factory(self, ml_framework: str, model_algorithm: str, prediction_problem: str, model_params: dict):
        ml_framework = self.ml_framework_key[ml_framework]

        try:
            return getattr(import_module(f'.{ml_framework}', 'training'), f'{ml_framework}')(model_algorithm, prediction_problem, model_params)
        except ModuleNotFoundError:
            raise ModuleNotFoundError(f'No module named {ml_framework} in training!')


class SKLearnTrainer():
    ml_algorithm_key = {'Random Forest': {'regression': 'RandomForestRegressor', 'classification': 'RandomForestClassifier'}}

    def __init__(self, model_algorithm: str, prediction_problem: str, model_params: dict):
        self.model_algorithm = model_algorithm
        self.prediction_problem = prediction_problem
        self.model_params = model_params
        self.model = None


    def build(self):
        sklearn_ensemble = self.ml_algorithm_key[self.model_algorithm][self.prediction_problem]
        self.model = getattr(import_module(f'.ensemble', 'sklearn'), sklearn_ensemble)(self.model_params)
    

    def train(self, dataset):
        X_train, y_train = get_XY(dataset['training'])

        self.model.fit(X_train, y_train)

    
    def evaluate(self, dataset):
        X_test, y_test = get_XY(dataset['testing'])

        '''
        if self.prediction_problem == 'regression':
            y_pred = self.model.predict(X_test)
        else:
            y_pred = self.model.predict_proba(X_test)
        '''
        
        # NOTE:: This evaluates the model based on a pre-defined metric.
        # Would be better to make predictions and evaluate based on a chosen metric.
        # This is just the most simple solution for now.
        return self.model.score(X_test, y_test)