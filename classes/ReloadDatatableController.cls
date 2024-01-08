public with sharing class ReloadDatatableController {
    @AuraEnabled
    public static List<Opportunity> getRelatedRecords(String accountId){
        try {
            return [SELECT Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate FROM Opportunity WHERE AccountId =:accountId ORDER BY CreatedDate DESC LIMIT 50];
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void updateOpportunities(List<Opportunity> opposforUpdate) {
        if (!Schema.sObjectType.Opportunity.isUpdateable()) {
            throw new SecurityException(
                'Insufficient permissions to update contacts'
            );
        }
        update opposforUpdate;
    }
}