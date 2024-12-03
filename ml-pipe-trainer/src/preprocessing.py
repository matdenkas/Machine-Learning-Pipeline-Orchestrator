# -*- coding: utf-8 -*-
#----------------------------------
# Created By : Beto Estrada
# Created Date: 10/18/2024
# version 1.0
#----------------------------------
""" This file contains logic and data structures
for preprocessing tasks
 """ 
#----------------------------------
# 
#
from abc import ABC, abstractmethod
from importlib import import_module
import pandas as pd

class IPreprocessing(ABC):
    @abstractmethod
    def preprocess_data(self, preprocessing_task_request: dict, df: pd.DataFrame) -> pd.DataFrame:
        """Abstract method to define the preprocessing operation.

        Args:
            preprocessing_task (dict): The type of preprocessing the dataset requires. Located in the preprocessingTasks 
            section of the job specification

            df (DataFrame): The data that is to be preprocessed

        Raises:
            NotImplementedError: An error will appear when the function has not been implemented

        Returns:
            DataFrame: A DataFrame with the new preprocessed data
        """
        raise NotImplementedError
    

class Interpolation(IPreprocessing):

    def preprocess_data(self, preprocessing_task_request: dict, df: pd.DataFrame):
        args = preprocessing_task_request['args']

        # Extract and removed 'dataSeries' from args. The remaining args will be
        # passed directly to the interpolate function
        data_series_columns = args.pop('dataSeries', None)

        df[data_series_columns] = df[data_series_columns].interpolate(**args)

        return df
    

class DropNaNs(IPreprocessing):

    def preprocess_data(self, preprocessing_task_request: dict, df: pd.DataFrame):
        args = preprocessing_task_request['args']

        df = df.dropna(**args)

        return df


def preprocessing_factory(preprocessing_task_name: str) -> IPreprocessing :
    """Uses the preprocessing_task_name to dynamically import a module
    and instantiate a preprocessing class.

    Args:
        preprocessing_task_name (str): Name of the preprocessing class/module.

    Raises:
        ImportError: An error will appear when something is wrong with the import

    Returns:
        Preprocessing:  Instance of the preprocessing class.
    """
    try:
        MODULE_NAME = 'src'
        return getattr(import_module(f'.preprocessing', MODULE_NAME), preprocessing_task_name)()
    except (ModuleNotFoundError, AttributeError) as e:
        raise ImportError(f'Error importing preprocessing class {preprocessing_task_name}: {e}')