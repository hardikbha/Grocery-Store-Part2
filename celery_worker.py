from celery import Celery
# from celery.result import AsyncResult

def make_celery(app):
    celery = Celery(
        "app",
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND'],
        enable_utc=False,
        timezone="Asia/Calcutta"
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
