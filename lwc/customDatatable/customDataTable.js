import LightningDatatable from 'lightning/datatable';
import DatatablePicklistTemplate from './picklistTemplate.html';
import DatatableLookupTemplate from "./lookupTemplate.html";

export default class CustomDatatable extends LightningDatatable {
    static customTypes = {
        picklist: {
            template: DatatablePicklistTemplate,
            standardCellLayout: true,
            typeAttributes: ['label', 'placeholder', 'options', 'value', 'context', 'variant','name']
        },
        lookup: {
            template: DatatableLookupTemplate,
            standardCellLayout: true,
            typeAttributes: ['label', 'value', 'placeholder', 'fieldName', 'object', 'context', 'variant', 'name', 'fields', 'target']
        }
    };
}