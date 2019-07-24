import {JupyterFrontEnd, JupyterFrontEndPlugin} from '@jupyterlab/application';
import {CommonCanvas, CanvasController} from "@wdp/common-canvas";
import {Widget, PanelLayout} from '@phosphor/widgets';
import {ICommandPalette, showDialog, Dialog} from "@jupyterlab/apputils";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "carbon-components/css/carbon-components.min.css";
import "@wdp/common-canvas/dist/common-canvas.min.css";
import * as palette from "./palette.json";
import {ServerConnection} from "@jupyterlab/services";
import {URLExt} from "@jupyterlab/coreutils";

/*
 * Class for dialog that pops up for new nodes (takes the filename as input)
 */
class NotebookNode extends Widget implements Dialog.IBodyWidget<string> {
  canvasController: any;
  nodeId: string;

  constructor(canvasController: any, nodeId: string) {
    super();
    this.canvasController = canvasController;

    let layout = (this.layout = new PanelLayout());
    let htmlContent = document.createElement('div');
    ReactDOM.render(<input
      type="text"
      id="endpoint"
      name="endpoint"
      placeholder="Filename" />, htmlContent);

    this.nodeId = nodeId;

    layout.addWidget(new Widget( {node: htmlContent} ));
  }

  getValue() {
  	return (document.getElementById("endpoint") as HTMLInputElement).value;
  }
}

/*
 * Class for dialog that pops up for pipeline submission
 */
class PipelineDialog extends Widget implements Dialog.IBodyWidget<any> {

  constructor(props: any) {
    super(props);

    let layout = (this.layout = new PanelLayout());
    let htmlContent = document.createElement('div');
    ReactDOM.render(
    	(<input 
      	type="text"
      	id="pipeline_name"
      	name="pipeline_name"
      	placeholder="Pipeline Name"/>), htmlContent);

    layout.addWidget(new Widget( {node: htmlContent} ));
  }
  getValue() {
  	return {'pipeline_name': (document.getElementById("pipeline_name") as HTMLInputElement).value };
  }
 }

/*
 * Class for Common Canvas React Component
 */
class Canvas extends React.Component<{},{}> {
  canvasController: any;

  constructor(props: any) {
    super(props);
    this.canvasController = new CanvasController();
    this.canvasController.setPipelineFlowPalette(palette);
    this.editActionHandler = this.editActionHandler.bind(this);
    this.toolbarMenuActionHandler = this.toolbarMenuActionHandler.bind(this);
  }

  render() {
    const style = { height: "100%" };
    const canvasConfig = { enableInternalObjectModel: true };
    return (
      <div style={style}>
      <CommonCanvas
      canvasController={this.canvasController}
      enableNarrowPalette={false}
      editActionHandler={this.editActionHandler}
      toolbarMenuActionHandler={this.toolbarMenuActionHandler}
      toolbarConfig={[
       { action: "run", label: "Run Pipeline", enable: true },
       { divider: true },
       { action: "undo", label: "Undo", enable: true },
       { action: "redo", label: "Redo", enable: true },
       { action: "cut", label: "Cut", enable: false },
       { action: "copy", label: "Copy", enable: false },
       { action: "paste", label: "Paste", enable: false },
       { action: "addComment", label: "Add Comment", enable: true },
       { action: "delete", label: "Delete", enable: true },
       { action: "arrangeHorizontally", label: "Arrange Horizontally", enable: true },
       { action: "arrangeVertically", label: "Arrange Vertically", enable: true } ]}
       config={canvasConfig}
      />
      </div>
      );
  }

  /*
   * Handles creating new nodes in the canvas
   */
  editActionHandler(data: any) {
    if (data.editType == "createNode") {
      showDialog({
        body: new NotebookNode(this.canvasController, data.nodeId)
      }).then( result => {
      	console.log(result);
        if( result.value == null) {
          // When Cancel is clicked on the dialog, just return
          return;
        }
        console.log(result);
        this.canvasController.setNodeLabel(data.nodeId,result.value);
      });
    }
  }

  /* 
   * Handles submitting pipeline runs
   */
  toolbarMenuActionHandler(action: any, source: any) {
  	console.log(action);
  	if (action == 'run') {
	    showDialog({
	      body: new PipelineDialog({})
	    }).then( result => {
	    	console.log(result);
	      if( result.value == null) {
	        // When Cancel is clicked on the dialog, just return
	        return;
	      }

	      // prepare notebook submission details
	      console.log(this.canvasController.getPipelineFlow());
	      let notebookTask = {'pipeline_data': this.canvasController.getPipelineFlow().pipelines[0], 
	      										'pipeline_name': result.value.pipeline_name,
                            'docker_image': 'tensorflow/tensorflow:1.13.2-py3-jupyter'};
	      let requestBody = JSON.stringify(notebookTask);

	      // use ServerConnection utility to make calls to Jupyter Based services
	      // which in this case is the scheduler extension installed by this package
	      let settings = ServerConnection.makeSettings();
	      let url = URLExt.join(settings.baseUrl, 'scheduler');
	      // let requestBody = JSON.stringify(notebookTask);

	      ServerConnection.makeRequest(url, { method: 'POST', body: requestBody }, settings)
	      .then(response => {
	        if (response.status !== 200) {
	          return response.json().then(data => {
	            showDialog({
	              title: "Error submitting Notebook !",
	              body: data.message,
	              buttons: [Dialog.okButton()]
	            })
	          });
	        }
	        return response.json();
	      })
	      .then(data => {
	        if( data ) {
	          let dialogTitle: string = 'Job submission to ' + result.value;
	          let dialogBody: string = '';
	          if (data['status'] == 'ok') {
	            dialogTitle =  dialogTitle + ' succeeded !';
	            dialogBody = 'Check details on submitted jobs at : <br> <a href=' + data['url'].replace('/&', '&') + ' target="_blank">Console & Job Status</a>';
	          } else {
	            dialogTitle =  dialogTitle + ' failed !';
	            dialogBody = data['message'];
	          }
	          showDialog({
	            title: dialogTitle,
	            body: dialogBody,
	            buttons: [Dialog.okButton()]
	          })
	        }
	      });
	    });
	  }
  }
}

/**
 * Initialization data for the pipeline-editor-extension extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'pipeline-editor-extension',
  autoStart: true,
  requires: [ICommandPalette],

  activate: (app: JupyterFrontEnd, palette: ICommandPalette) => {
    let widget: Widget = new Widget();
    widget.id = 'pipeline-editor-jupyterlab';
    widget.title.label = 'Pipeline Editor';
    widget.title.closable = true;

    // Add an application command
    const command: string = 'pipeline-editor:open';
    app.commands.addCommand(command, {
      label: 'Pipeline Editor',
      execute: () => {
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget,'main');
        }

        let props = {};
        let canvas = React.createElement(Canvas, props, null);

        ReactDOM.render(canvas,widget.node);

        // Activate the widget
        app.shell.activateById(widget.id);
      }
    });
    // Add the command to the palette.
    palette.addItem({command, category: 'Extensions'});
  }
 };
 export default extension;
