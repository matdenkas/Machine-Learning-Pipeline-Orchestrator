from pandas import DataFrame

from src.preprocessing import preprocessing_factory
from src.training import TrainingManager

def run_pipeline(df_dataset: DataFrame, job_specification: dict):
    preprocessing_tasks = job_specification['preprocessingTasks']

    df_dataset = preprocess_data(preprocessing_tasks, df_dataset)

    model_definitions = job_specification['modelDefinitions']

    df_performance_metrics = train_models(model_definitions, df_dataset)

    return df_performance_metrics


def preprocess_data(preprocessing_tasks: list, df_dataset: DataFrame):
    if preprocessing_tasks is None:
        return df_dataset
    
    for preprocessing_task_request in preprocessing_tasks:
        preprocessing_class = preprocessing_factory(preprocessing_task_request['task'])
        df_dataset = preprocessing_class.preprocess_data(preprocessing_task_request, df_dataset)

    return df_dataset


def train_models(model_definitions: list, df_dataset: DataFrame):
    all_performance_metrics = []
    for model_definition in model_definitions:
        performance_metrics = {}

        performance_metrics['model_id'] = model_definition['id']
        
        training_manager = TrainingManager(model_definition, df_dataset)

        score = training_manager.train_model()

        performance_metrics['score'] = score

        all_performance_metrics.append(performance_metrics)
            
    df_performance_metrics = DataFrame(all_performance_metrics)

    return df_performance_metrics