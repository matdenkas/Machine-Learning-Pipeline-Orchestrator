import numpy as np
import pandas as pd
from pandas import DataFrame

def cross_validation(df: DataFrame, cross_validation_information: dict):
    if cross_validation_information['type'] == 'year':
        return split_dataset_by_year(df, cross_validation_information)


def split_dataset_by_year(df: DataFrame, cross_validation_information: dict):
    df.index = pd.to_datetime(df.index)

    dataset = {}

    dataset['training'] = df[df.index.year.isin(cross_validation_information['trainingYears'])]

    dataset['validation'] = None

    validation_years = cross_validation_information['validationYears']
    if validation_years is not None:
        dataset['validation'] = df[df.index.year.isin(validation_years)]

    dataset['testing'] = df[df.index.year.isin(cross_validation_information['testingYears'])]

    return dataset


def get_XY(df, target_features):
    y = np.array(df[target_features]).ravel()
    X = np.array(df.drop(target_features, axis=1))

    return X, y