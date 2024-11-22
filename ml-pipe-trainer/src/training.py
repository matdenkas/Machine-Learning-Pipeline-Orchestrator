# -*- coding: utf-8 -*-
#----------------------------------
# Created By : Beto Estrada
# Created Date: 10/18/2024
# version 1.0
#----------------------------------
""" This file contains logic and data structures
for a TrainingManager, which initiates the training process,
and ModelTrainers which train the models utilizing a specified
machine learning (ML) library / framework.
 """ 
#----------------------------------
# 
#
from abc import ABC, abstractmethod
from importlib import import_module
from pandas import DataFrame
from pickle import dumps

from src.data_manipulation import cross_validation, get_XY

class TrainingManager():
    ml_framework_dict = {'scikit-learn': 'SKLearnTrainer'}

    def __init__(self, model_definition: dict, df_dataset: DataFrame):
        self.model_definition = model_definition
        self.df_dataset = df_dataset

    
    def train_model(self):
        model_trainer = self.build_model()

        dataset = cross_validation(self.df_dataset, self.model_definition['crossValidation'])

        model_trainer.train(dataset)

        score = model_trainer.evaluate(dataset)

        #model_weights = model_trainer.get_model_weights()

        return score


    def build_model(self):
        ml_framework = self.ml_framework_dict[self.model_definition['mlFramework']]

        model_trainer = model_trainer_factory(ml_framework, self.model_definition)

        model_trainer.build()

        return model_trainer


class IModelTrainer(ABC):
    @abstractmethod
    def __init__(self, model_definition: dict):
        """Abstract method to define the machine learning (ML) model trainer. Model trainers
        are wrappers around existing python ML libraries/frameworks

        Args:
            model_definition (dict): Dictionary holding information about model

        Raises:
            NotImplementedError: An error will appear when the function has not been implemented
        """
        raise NotImplementedError
    

    @abstractmethod
    def build(self):
        """Abstract method to define the machine learning (ML) model build process

        Raises:
            NotImplementedError: An error will appear when the function has not been implemented
        """
        raise NotImplementedError
    

    @abstractmethod
    def train(self, dataset: dict):
        """Abstract method to define the machine learning (ML) model training process

        Args:
            dataset (dict): Dictionary containing the dataset to use for training/validation/testing

        Raises:
            NotImplementedError: An error will appear when the function has not been implemented
        """
        raise NotImplementedError
    

    @abstractmethod
    def evaluate(self, dataset: dict):
        """Abstract method to define the machine learning (ML) model evaluation process

        Args:
            dataset (dict): Dictionary containing the dataset to use for training/validation/testing

        Raises:
            NotImplementedError: An error will appear when the function has not been implemented
        """
        raise NotImplementedError


class SKLearnTrainer():

    ml_algorithm_key = {'Random Forest': {'regression': 'RandomForestRegressor', 'classification': 'RandomForestClassifier', 'class': 'ensemble'},
                        'MLP': {'regression': 'MLPRegressor', 'classification': 'MLPClassifier', 'class': 'neural_network'}
                        }

    def __init__(self, model_definition: dict):
        self.model_definition = model_definition
        self.model = None


    def build(self):
        model_algorithm = self.model_definition['mlAlgorithm']
        prediction_problem = self.model_definition['predictionProblem']
        model_params = self.model_definition['modelParams']

        sklearn_model = self.ml_algorithm_key[model_algorithm][prediction_problem]
        sklearn_model_class = self.ml_algorithm_key[model_algorithm]['class']
        self.model = getattr(import_module(f'.{sklearn_model_class}', 'sklearn'), sklearn_model)(**model_params)
    

    def train(self, dataset):
        target_features = self.model_definition['target']
        X_train, y_train = get_XY(dataset['training'], target_features)

        self.model.fit(X_train, y_train)

    
    def evaluate(self, dataset):
        target_features = self.model_definition['target']
        X_test, y_test = get_XY(dataset['testing'], target_features)

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
    

    def get_model_weights(self):
        model_weights = dumps(self.model)
        return model_weights
    

def model_trainer_factory(ml_framework: str, model_definition: dict):
    try:
        MODULE_NAME = 'src'
        return getattr(import_module(f'.training', MODULE_NAME), f'{ml_framework}')(model_definition)
    except ModuleNotFoundError:
        raise ModuleNotFoundError(f'No module named {ml_framework} in {MODULE_NAME}!')