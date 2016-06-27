angular.module( 'orderCloud' )

    .config ( GiftCardsConfig )
    .controller( 'GiftCardsCtrl', GiftCardsController )
    .controller( 'GiftCardCreateCtrl', GiftCardCreateController )
    .controller( 'GiftCardEditCtrl', GiftCardEditController )
    .controller( 'GiftCardAssignGroupCtrl', GiftCardAssignGroupController )
    .controller( 'GiftCardAssignUserCtrl', GiftCardAssignUserController )
    .factory( 'GiftCardFactory', GiftCardFactory )

;

function GiftCardsConfig( $stateProvider ) {
    $stateProvider
        .state( 'giftCards', {
            parent: 'base',
            url: '/giftCards',
            templateUrl: 'giftCards/templates/giftCards.tpl.html',
            controller: 'GiftCardsCtrl',
            controllerAs: 'giftCards',
            data: {componentName: 'Gift Cards'},
            resolve: {
                GiftCardList: function(OrderCloud) {
                    return OrderCloud.SpendingAccounts.List(null, null, null, null, null, {'RedemptionCode': '*'});
                }
            }
        })
        .state( 'giftCards.edit', {
            url: '/:giftCardid/edit',
            templateUrl: 'giftCards/templates/giftCardEdit.tpl.html',
            controller: 'GiftCardEditCtrl',
            controllerAs: 'giftCardEdit',
            resolve: {
                SelectedGiftCard: function($q,$stateParams, OrderCloud) {
                    var d = $q.defer();
                     OrderCloud.SpendingAccounts.Get($stateParams.giftCardid)
                        .then(function(giftcard){
                            if(giftcard.StartDate != null)
                                giftcard.StartDate = new Date(giftcard.StartDate);
                            if(giftcard.EndDate != null)
                                giftcard.EndDate = new Date(giftcard.EndDate);
                            d.resolve(giftcard);
                });
                
                    return d.promise;
                }
            }
        })

        .state( 'giftCards.create', {
            url: '/create',
            templateUrl: 'giftCards/templates/giftCardCreate.tpl.html',
            controller: 'GiftCardCreateCtrl',
            controllerAs: 'giftCardCreate'
        })
        .state( 'giftCards.assignGroup', {
            url: '/:giftCardid/assign',
            templateUrl: 'giftCards/templates/giftCardAssignGroup.tpl.html',
            controller: 'GiftCardAssignGroupCtrl',
            controllerAs: 'giftCardAssign',
            resolve: {
                UserGroupList: function(OrderCloud) {
                    return OrderCloud.UserGroups.List();
                },
                AssignedUserGroups: function($stateParams, OrderCloud) {
                    return OrderCloud.SpendingAccounts.ListAssignments($stateParams.giftCardid, null, null, 'Group');
                },
                SelectedGiftCard: function($stateParams, OrderCloud) {
                    return OrderCloud.SpendingAccounts.Get($stateParams.giftCardid);
                }
            }
        })
        .state( 'giftCards.assignUser', {
            url: '/:giftCardid/assign/user',
            templateUrl: 'giftCards/templates/giftCardAssignUser.tpl.html',
            controller: 'GiftCardAssignUserCtrl',
            controllerAs: 'giftCardAssignUser',
            resolve: {
                UserList: function(OrderCloud) {
                    return OrderCloud.Users.List();
                },
                AssignedUsers: function($stateParams, OrderCloud) {
                    return OrderCloud.SpendingAccounts.ListAssignments($stateParams.giftCardid, null, null, 'User');
                },
                SelectedGiftCard: function($stateParams, OrderCloud) {
                    return OrderCloud.SpendingAccounts.Get($stateParams.giftCardid);
                }
            }
        });
}

function GiftCardsController ( OrderCloud, GiftCardList, TrackSearch ) {
    var vm = this;
    vm.list = GiftCardList;
    vm.pagingfunction = PagingFunction;
    vm.searchfunction = Search;
    vm.searching = function() {
        return TrackSearch.GetTerm() ? true : false;
    };

    function PagingFunction() {
        if (vm.list.Meta.Page < vm.list.Meta.TotalPages) {
            OrderCloud.SpendingAccounts.List(null, vm.list.Meta.Page + 1, vm.list.Meta.PageSize, null, null, {'RedemptionCode': '*'});
        }
    }

    function Search(searchTerm) {
        return OrderCloud.SpendingAccounts.List(searchTerm, null, null, null, null, {'RedemptionCode': '*'});
    }
}

function GiftCardEditController($state, $exceptionHandler, OrderCloud, SelectedGiftCard, GiftCardFactory, toastr) {
    var vm = this,
        giftCardID = SelectedGiftCard.ID;
    vm.format = GiftCardFactory.dateFormat;
    vm.open1 = vm.open2 = false;
    vm.giftCard = SelectedGiftCard;
    vm.Submit = Submit;
    vm.Delete = Delete;
    vm.giftCard.AllowAsPaymentMethod = true;

    function Submit() {
        OrderCloud.SpendingAccounts.Update(giftCardID, vm.giftCard)
            .then(function() {
                $state.go('giftCards', {}, {reload:true});
                toastr.success('Gift Card Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }

    function Delete() {
        OrderCloud.SpendingAccounts.Delete(giftCardID)
            .then(function() {
                $state.go('giftCards', {}, {reload:true});
                toastr.success('Gift Card Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
  
}

function GiftCardCreateController($state, $exceptionHandler, OrderCloud, GiftCardFactory, toastr) {
    var vm = this;
    vm.format = GiftCardFactory.dateFormat;
    vm.open1 = vm.open2 = false;
    vm.Submit = Submit;
    vm.autoGen = GiftCardFactory.autoGenDefault;
    vm.createCode = GiftCardFactory.makeCode;
    vm.giftCard = {};
    vm.giftCard.AllowAsPaymentMethod = true;

    function Submit() {
        OrderCloud.SpendingAccounts.Create(vm.giftCard)
            .then(function() {
                $state.go('giftCards', {}, {reload:true});
                toastr.success('Gift Card Created', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
    

}

function GiftCardAssignGroupController($scope, $q, OrderCloud, UserGroupList, AssignedUserGroups, SelectedGiftCard, Paging, Assignments, toastr) {
    var vm = this;
    vm.list = UserGroupList;
    vm.assignments = AssignedUserGroups;
    vm.giftCard = SelectedGiftCard;
    vm.saveAssignments = SaveAssignments;
    vm.pagingfunction = PagingFunction;

    $scope.$watchCollection(function(){
        return vm.list;
    }, function(){
        Paging.setSelected(vm.list.Items, vm.assignments.Items, 'UserGroupID')
    });

    function SaveFunc(ItemID) {
        return OrderCloud.SpendingAccounts.SaveAssignment({
            SpendingAccountID: vm.giftCard.ID,
            UserID: null,
            UserGroupID: ItemID,
            AllowExceed: false
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.SpendingAccounts.DeleteAssignment(vm.giftCard.ID, null, ItemID);
    }

    function SaveAssignments() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'UserGroupID');
    }

    function PagingFunction() {
        if (vm.list.Meta.Page < vm.list.Meta.PageSize) {
            var queue = [];
            var dfd = $q.defer();
            queue.push(OrderCloud.UserGroups.List(null, vm.list.Meta.Page + 1, vm.list.Meta.PageSize, null, null, {'RedemptionCode': '*'}));
            if (vm.assignments.Meta.Page < vm.assignments.Meta.PageSize) {
                OrderCloud.SpendingAccounts.ListAssignments(vm.giftCard.ID, null, null, 'Group', vm.list.Meta.Page + 1, vm.list.Meta.PageSize);
            }
            $q.all(queue).then(function(results) {
                dfd.resolve();
                vm.list.Meta = results[0].Meta;
                vm.list.Items = [].concat(vm.list.Items, results[0].Items);
                if (results[1]) {
                    vm.assignments.Meta = results[1].Meta;
                    vm.assignments.Items = [].concat(vm.assignments.Items, results[1].Items);
                }
            });
        }
    }
}

function GiftCardAssignUserController($scope, $q, OrderCloud, UserList, AssignedUsers, SelectedGiftCard, Assignments, Paging, toastr) {
    var vm = this;
    vm.list = UserList;
    vm.assignments = AssignedUsers;
    vm.giftCard = SelectedGiftCard;
    vm.saveAssignments = SaveAssignments;
    vm.pagingfunction = PagingFunction;

    $scope.$watchCollection(function(){
        return vm.list;
    }, function(){
        Paging.setSelected(vm.list.Items, vm.assignments.Items, 'UserID')
    });

    function SaveFunc(ItemID) {
        return OrderCloud.SpendingAccounts.SaveAssignment({
            SpendingAccountID: vm.giftCard.ID,
            UserID: ItemID,
            UserGroupID: null,
            AllowExceed: false
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.SpendingAccounts.DeleteAssignment(vm.giftCard.ID, ItemID, null);
    }

    function SaveAssignments() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'UserID');
    }

    function PagingFunction() {
        if (vm.list.Meta.Page < vm.list.Meta.PageSize) {
            var queue = [];
            var dfd = $q.defer();
            queue.push(OrderCloud.Users.List(null, vm.list.Meta.Page + 1, vm.list.Meta.PageSize, null, null, {'RedemptionCode': '*'}));
            if (vm.assignments.Meta.Page < vm.assignments.Meta.PageSize) {
                OrderCloud.SpendingAccounts.ListAssignments(vm.giftCard.ID, null, null, 'User', vm.list.Meta.Page + 1, vm.list.Meta.PageSize);
            }
            $q.all(queue).then(function(results) {
                dfd.resolve();
                vm.list.Meta = results[0].Meta;
                vm.list.Items = [].concat(vm.list.Items, results[0].Items);
                if (results[1]) {
                    vm.assignments.Meta = results[1].Meta;
                    vm.assignments.Items = [].concat(vm.assignments.Items, results[1].Items);
                }
            });
        }
    }
}

function GiftCardFactory() {
    return {
        dateFormat: 'MM/dd/yyyy',
        autoGenDefault: true,
        makeCode: function(bits) {
            bits = typeof  bits !== 'undefined' ? bits : 16;
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var code = "";
            for (var i = 0; i < bits; i += 1) {
                code += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return code;
        }
    }
}
