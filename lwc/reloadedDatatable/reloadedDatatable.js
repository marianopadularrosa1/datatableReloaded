import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import getRelatedRecords from '@salesforce/apex/ReloadDatatableController.getRelatedRecords';
import updateOpportunities from '@salesforce/apex/ReloadDatatableController.updateOpportunities';
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import OPPORTUNITY_OBJECT from "@salesforce/schema/Opportunity";
import STAGE_FIELD from "@salesforce/schema/Opportunity.StageName";


const COLUMNS = [
    {
        label: 'Opportunity Name',
        fieldName: 'linkName',
        type: 'url',
        typeAttributes: {
            label: { fieldName: 'Name' },
            target: '_self'
        }
    },
    {
        label: 'Account Name',
        fieldName: 'AccountId',
        type: 'lookup',
        typeAttributes: {
            placeholder: 'Choose Account',
            object: 'Opportunity',
            fieldName: 'AccountId',
            label: 'Account',
            value: { fieldName: 'AccountId' },
            context: { fieldName: 'Id' },
            variant: 'label-hidden',
            name: 'Account',
            fields: ['Account.Name'],
            target: '_self'
        },
        editable: false,
        cellAttributes: {
            class: { fieldName: 'accountNameClass' }
        }
    },
    {
        label: 'Amount',
        fieldName: 'Amount',
        type: 'text',
        editable: true
    },
    {
        label: 'Close Date',
        fieldName: 'CloseDate',
        type: 'date-local',
        typeAttributes: {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        },
        editable: true
    }
];

export default class ReloadedDatatable extends LightningElement {

    columns = COLUMNS;
    records;
    lastSavedData;
    error;
    accountId;
    wiredRecords;
    showSpinner = false;
    showTable = false;
    draftValues = [];
    defaultRecordTypeId;
    stagePicklistValues;
    //used to obtain the picklist as private children of datatable
    privateChildren = {}; 

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
    getOpportunityInfo({data, error}) {
        if (data) {
            this.defaultRecordTypeId = data.defaultRecordTypeId;
        }
        else if (error) {
            console.log(error);        
        }
    };

    @wire(getPicklistValues, { recordTypeId: '$defaultRecordTypeId', fieldApiName: STAGE_FIELD })
    getStagePicklistValues({data, error}) {
        
        if (data) {
            this.stagePicklistValues = data.values;
            this.columns.splice(2,0,{
                label: 'Stage',
                fieldName: 'StageName',
                type: 'picklist',
                editable: false,
                typeAttributes: {
                    placeholder: 'Choose Stage',
                    options: this.stagePicklistValues,
                    value: { fieldName: 'StageName' },
                    context: { fieldName: 'Id' },
                    variant: 'label-hidden',
                    name: 'Stage',
                    label: 'Stage'
                },
                cellAttributes: {
                    class: { fieldName: 'stageClass' }
                }
            });
        }
        else if (error) {
            console.log(error);        
        }
    };

    renderedCallback() {
        if (!this.isComponentLoaded) {
            window.addEventListener('click', (evt) => {
                this.handleClickOnWindow(evt);
            });
            this.isComponentLoaded = true;
        }
    }

    disconnectedCallback() {
        window.removeEventListener('click', () => { });
    }

    handleClickOnWindow(context) {
        
        this.resetPopups('c-datatable-picklist', context);
        this.resetPopups('c-datatable-lookup', context);
    }

    
    resetPopups(markup, context) {
        let elementMarkup = this.privateChildren[markup];
        if (elementMarkup) {
            Object.values(elementMarkup).forEach((element) => {
                element.callbacks.reset(context);
            });
        }
    }


    async loadRelatedRecords(pAccountId){
        let result;
        try {
          result = await getRelatedRecords({accountId:pAccountId});
          this.records = JSON.parse(JSON.stringify(result));
          this.records.forEach(record => {
              record.linkName = '/' + record.Id;
              if (record.AccountId) {
                  record.linkAccount = '/' + record.AccountId;
                  record.accountName = record.Account.Name;
                  record.accountNameClass = 'slds-cell-edit';
              }
              record.stageClass = 'slds-cell-edit';
          });

        } catch (error) {
          result = undefined;
          console.log('loadRelatedRecords:',JSON.stringify(error));  
        }
        finally{
            return this.records;
        }
    }


    // Event to register the datatable picklist and the lookup mark up.
    handleRegisterItem(event) {
        console.log('handleRegisterItem:::',event.detail);
        event.stopPropagation(); 
        const item = event.detail;
        if (!this.privateChildren.hasOwnProperty(item.name))
            this.privateChildren[item.name] = {};
        this.privateChildren[item.name][item.guid] = item;
    }

    async handleChange(event) {
        event.preventDefault();
        this.accountId = event.target.value;
        console.log('this.accountId::',this.accountId);
        this.showSpinner = true;
        await this.loadRelatedRecords(this.accountId);
        this.showSpinner = false;
        this.showTable = true;
        this.lastSavedData = this.records;
    }

    handleCancel(event) {
        event.preventDefault();
        this.records = JSON.parse(JSON.stringify(this.lastSavedData));
        this.handleClickOnWindow('reset');
        this.draftValues = [];
    }
	
	handleCellChange(event) {
        event.preventDefault();
        this.updateDraftValues(event.detail.draftValues[0]);
    }

    handleValueChange(event) {        

        event.stopPropagation();
        let dataRecieved = event.detail.data;
        let updatedItem;
        if (dataRecieved.label == 'Stage') {
            updatedItem = {
                Id: dataRecieved.context,
                StageName: dataRecieved.value
            };
            this.setClasses(dataRecieved.context,'stageClass','slds-cell-edit slds-is-edited');
        }
        else if (dataRecieved.label == 'Account') { 
            updatedItem = {
                    Id: dataRecieved.context,
                    AccountId: dataRecieved.value
                };
            this.setClasses(dataRecieved.context,'accountNameClass','slds-cell-edit slds-is-edited');
        }
        else{
            this.setClasses(dataRecieved.context, '', '');
        }
        console.log('updatedItem::',updatedItem);
        this.updateDraftValues(updatedItem);
        this.updateDataValues(updatedItem);
    }

    updateDataValues(updateItem) {
        
        let copyData = JSON.parse(JSON.stringify(this.records));
        copyData.forEach((item) => {
            if (item.Id === updateItem.Id) {
                for (let field in updateItem) {
                    item[field] = updateItem[field];
                }
            }
        });
        this.records = [...copyData];
    }

    updateDraftValues(updateItem) {
        
        let draftValueChanged = false;
        let copyDraftValues = JSON.parse(JSON.stringify(this.draftValues));
        copyDraftValues.forEach((item) => {
            if (item.Id === updateItem.Id) {
                for (let field in updateItem) {
                    item[field] = updateItem[field];
                }
                draftValueChanged = true;
            }
        });
        if (draftValueChanged) {
            this.draftValues = [...copyDraftValues];
        } else {
            this.draftValues = [...copyDraftValues, updateItem];
        }
      
    }

    handleEdit(event) {
        console.log('handleEdit dataRecieved:::',event.detail.data);
        event.preventDefault();
        let dataRecieved = event.detail.data;
        this.handleClickOnWindow(dataRecieved.context);
        if (dataRecieved.label ==='Stage' || dataRecieved.label ==='Account') {
            this.setClasses(dataRecieved.context,'stageClass','slds-cell-edit');
            }
            else{
                this.setClasses(dataRecieved.context, '', '');
            }
    }

    setClasses(id, fieldName, fieldValue) {
        this.records = JSON.parse(JSON.stringify(this.records));
        this.records.forEach((detail) => {
            if (detail.Id === id) {
                detail[fieldName] = fieldValue;
            }
        });
    }

    async handleSave(event) {
        event.preventDefault();
        this.showSpinner = true;
        this.showTable = false;
        const updatedFields = event.detail.draftValues;
        this.draftValues = [];

        try {
            // Pass edited fields to the updateOpportunities Apex controller
            await updateOpportunities({ opposforUpdate: updatedFields });

            
            this.showToast('Success', 'Opportunities updated successfully', 'success');
           
            //Refresh the data in the datatable
            await refreshApex(this.records);
        } catch (error) {
            this.showToast('Error while updating or refreshing records', error.body.message , 'error');
            console.log('error:',error);
            this.showSpinner = false;
        }
        finally{
            //reload Opportunities after updating fields
            this.records = await this.loadRelatedRecords(this.accountId);
            
            this.showSpinner = false;
            this.showTable = true;
           
        }
    }

    showToast(title, message, variant){
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }
}