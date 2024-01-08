import { LightningElement, api, wire } from 'lwc';
import { loadStyle } from "lightning/platformResourceLoader";
import CustomDataTableResource from "@salesforce/resourceUrl/CustomDataTable";
import { getRecord } from "lightning/uiRecordApi";

export default class DatatableLookup extends LightningElement {
    @api label;
    @api value;
    @api placeholder;
    @api fieldName;
    @api object;
    @api context;
    @api variant;
    @api name;
    @api fields;
    @api target;
    showLookup = false;

    
    @wire(getRecord, { recordId: '$value', fields: '$fields' })
    record;

    getFieldName() {
        let fieldName = this.fields[0];
        fieldName = fieldName.substring(fieldName.lastIndexOf('.') + 1, fieldName.length);
        return fieldName;
    }

    get lookupName() {
        return (this.record.data != null) ?  this.record.data.fields[this.getFieldName()].value : '';
    }
    get lookupValue() {
        return (this.record.data != null && this.record.data.fields[this.getFieldName()].value) ? '/' + this.value : '';
    }

    
   

    
    renderedCallback() {
        Promise.all([
            loadStyle(this, CustomDataTableResource),
        ]).then(() => { });
        if (!this.guid) {
            this.guid = this.template.querySelector('.lookupBlock').getAttribute('id');
            
            this.dispatchEvent(
                new CustomEvent('itemregister', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        callbacks: {
                            reset: this.reset
                        },
                        template: this.template,
                        guid: this.guid,
                        name: 'c-datatable-lookup'
                    }
                })
            );
        }
    }

    handleChange(event) {
        event.preventDefault();
        this.value = event.detail.value[0];
        this.showLookup = this.value != null ? false : true;
        this.dispatchCustomEvent('valuechange', this.context, this.value, this.label, this.name);
    }

    
    reset = (context) => {
        if (this.context !== context) {
            this.showLookup = false;
        }
    }

    
    handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.showLookup = true;
        this.dispatchCustomEvent('edit', this.context, this.value, this.label, this.name);
    }

    dispatchCustomEvent(eventName, context, value, label, name) {
        this.dispatchEvent(new CustomEvent(eventName, {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                data: { context: context, value: value, label: label, name: name }
            }
        }));
    }

   
}