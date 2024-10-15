import numpy as np
from pandas import DataFrame

def cross_validation(df: DataFrame, dataset_information: dict):
    dataset = {}

    dataset['training'] = df[df['date'].dt.year.isin(dataset_information['trainingYears'])]

    dataset['validation'] = None

    validation_years = dataset_information['validationYears']
    if validation_years is not None:
        dataset['validation'] = df[df['date'].dt.year.isin(validation_years)]

    dataset['testing'] = df[df['date'].dt.year.isin(dataset_information['testingYears'])]

    return dataset


def get_XY(df, target_features):
    y = np.array(df[target_features])
    X = np.array(df.drop(target_features, axis=1))

    return X, y