import json
import kfp
import os
import tarfile

from datetime import datetime
from minio import Minio
from minio.error import (ResponseError,
                         BucketAlreadyOwnedByYou,
                         BucketAlreadyExists)
from notebook.base.handlers import IPythonHandler


class SchedulerHandler(IPythonHandler):

    """REST-ish method calls to run our batch jobs"""
    def get(self):

        """ Assume that in the future this method will support status of batch jobs
        FFDL - may support polling through /v1/models/{model_id}/training_status """
        msg_json = dict(title="Operation not supported.")
        self.write(msg_json)
        self.flush()

    def post(self, *args, **kwargs):
        """Upload endpoint"""
        url = 'http://weakish1.fyre.ibm.com:32488/pipeline'
        endpoint = 'http://weakish1.fyre.ibm.com:30427'
        minio_username = 'minio'
        minio_password = 'minio123'
        bucket_name = 'pipelinenotebooks'

        options = self.get_json_body()

        # Iterate through the components and create a list of input components
        links = {}
        labels = {}
        for component in options['pipeline_data']['nodes']:
            # Set up dictionary to track node id's of inputs
            links[component['id']] = []
            if 'links' in component['inputs'][0]:
                for link in component['inputs'][0]['links']:
                    links[component['id']].append(link['node_id_ref'])

            # Set up dictionary to link component id's to
            # component names (which are ipynb filenames)

            # Component id's are generated by CommonCanvas
            labels[component['id']] = component['app_data']['ui_data']['label']

        # Initialize minioClient with an endpoint and access/secret keys.
        minio_client = Minio('weakish1.fyre.ibm.com:30427',
                             access_key=minio_username,
                             secret_key=minio_password,
                             secure=False)

        # Make a bucket with the make_bucket API call.
        try:
            minio_client.make_bucket(bucket_name)
        except BucketAlreadyOwnedByYou as err:
            pass
        except BucketAlreadyExists as err:
            pass
        except ResponseError as err:
            raise

        def cc_pipeline():
            # Create dictionary that maps component Id to its ContainerOp instance
            notebookops = {}
            # Create component for each node from CommonCanvas
            for componentId, inputs in links.items():
                name = labels[componentId].split(".")[0]

                output_filename = "tar" + options['pipeline_name'] + datetime.now().strftime("%m%d%H%M%S")
                extracted_dir_from_tar = os.path.basename(os.getcwd())

                notebookops[componentId] = \
                    kfp.dsl.ContainerOp(name=name,
                                        image=options['docker_image'],
                                        command=['sh', '-c'],
                                        arguments=['pip install papermill && '
                                                   'apt install -y wget &&'
                                                   'wget https://dl.min.io/client/mc/release/linux-amd64/mc && '
                                                   'chmod +x mc && '
                                                   './mc config host add aiworkspace '+endpoint+' '+minio_username+' '+minio_password+' && '
                                                   './mc cp aiworkspace/'+bucket_name+'/'+output_filename+ ' . && '
                                                   'tar -zxvf ' + output_filename + ' && '
                                                   'cd '+ extracted_dir_from_tar+ ' && '
                                                   'papermill ' + name + '.ipynb ' + name+'_output.ipynb'
                                        ])

                try:
                    source_dir = os.getcwd()
                    with tarfile.open(output_filename, "w:gz") as tar:
                        tar.add(source_dir, arcname=os.path.basename(source_dir))

                    minio_client.fput_object(bucket_name='pipelinenotebooks',
                                             object_name=output_filename,
                                             file_path=output_filename)
                except ResponseError as err:
                    print(err)

            # Add order based on list of inputs for each component.
            for componentId, inputs in links.items():
                for inputComponentId in inputs:
                    notebookops[componentId].after(notebookops[inputComponentId])

        pipeline_name = options['pipeline_name']+datetime.now().strftime("%m%d%H%M%S")

        if not os.path.exists('pipeline_files'):
            os.mkdir('pipeline_files')

        pipeline_path = 'pipeline_files/'+pipeline_name+'.tar.gz'

        # Compile the new pipeline
        kfp.compiler.Compiler().compile(cc_pipeline,pipeline_path)

        # Upload the compiled pipeline and create an experiment and run
        client = kfp.Client(host=url)
        client.run_pipeline(experiment_id=client.create_experiment(pipeline_name).id,
                            job_name=datetime.now().strftime("%m%d%H%M%S"),
                            pipeline_package_path=pipeline_path)

    def send_message(self, message):
        self.write(message)
        self.flush()

    def send_success_message(self, message, job_url):
        self.set_status(200)
        msg = json.dumps({"status": "ok",
                          "message": message,
                          "url": job_url})
        self.send_message(msg)

    def send_error_message(self, status_code, error_message):
        self.set_status(status_code)
        msg = json.dumps({"status": "error",
                          "message": error_message})
        self.send_message(msg)

