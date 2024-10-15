from pandas import DataFrame

from training import ModelTrainer

def run_pipeline(df_dataset: DataFrame, job_specification: dict):
    # Preprocessing would go here

    model_specifications = job_specification['modelSpecifications']

    df_performance_metrics = train_models(model_specifications, df_dataset)

    return df_performance_metrics


def train_models(model_specifications: dict, df_dataset: DataFrame):
    all_performance_metrics = []
    for model_specification in model_specifications:
        performance_metrics = {}

        performance_metrics['model_id'] = model_specification['id']
        
        model_trainer = ModelTrainer(model_specification, df_dataset)

        score = model_trainer.train_model()

        performance_metrics['score'] = score

        all_performance_metrics.append(performance_metrics)
            
    df_performance_metrics = DataFrame(all_performance_metrics)

    return df_performance_metrics