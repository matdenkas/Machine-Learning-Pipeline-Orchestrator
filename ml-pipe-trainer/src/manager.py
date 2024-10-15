from pandas import DataFrame

from training import ModelTrainer

def run_pipeline(df_dataset: DataFrame, job_specification: dict):
    # Preprocessing would go here

    model_specifications = job_specification['modelSpecifications']

    train_models(model_specifications, df_dataset)


def train_models(model_specifications: dict, df_dataset: DataFrame):
    for model_specification in model_specifications:
        model_trainer = ModelTrainer(model_specification, df_dataset)

        model_trainer.train_model()