angular.module( 'orderCloud' )

	.config( AddressesConfig )
	.controller( 'AddressesCtrl', AddressesController )
	.controller( 'AddressEditCtrl', AddressEditController )
	.controller( 'AddressCreateCtrl', AddressCreateController )
    .controller( 'AddressAssignCtrl', AddressAssignController )

;

function AddressesConfig( $stateProvider ) {
	$stateProvider
		.state( 'addresses', {
			parent: 'base',
			url: '/addresses',
			templateUrl:'addresses/templates/addresses.tpl.html',
			controller:'AddressesCtrl',
			controllerAs: 'addresses',
			data: {componentName: 'Addresses'},
			resolve: {
				AddressList: function(OrderCloud) {
					return OrderCloud.Addresses.List();
				}
			}
		})
		.state( 'addresses.edit', {
			url: '/:addressid/edit',
			templateUrl:'addresses/templates/addressEdit.tpl.html',
			controller:'AddressEditCtrl',
			controllerAs: 'addressEdit',
			resolve: {
				SelectedAddress: function($stateParams, $state, OrderCloud) {
					return OrderCloud.Addresses.Get($stateParams.addressid).catch(function() {
                        $state.go('^');
                    });
				}
			}
		})
		.state( 'addresses.create', {
			url: '/addresses/create',
			templateUrl:'addresses/templates/addressCreate.tpl.html',
			controller:'AddressCreateCtrl',
			controllerAs: 'addressCreate'
		})
        .state( 'addresses.assign', {
            url: '/addresses/:addressid/assign',
	        templateUrl: 'addresses/templates/addressAssign.tpl.html',
	        controller: 'AddressAssignCtrl',
	        controllerAs: 'addressAssign',
	        resolve: {
                UserGroupList: function(OrderCloud) {
                    return OrderCloud.UserGroups.List();
                },
                AssignmentsList: function($stateParams, OrderCloud) {
                    return OrderCloud.Addresses.ListAssignments($stateParams.addressid);
                },
                SelectedAddress: function($stateParams, $state, OrderCloud) {
                    return OrderCloud.Addresses.Get($stateParams.addressid).catch(function() {
                        $state.go('^');
                    });
                }
            }
        })
}

function AddressesController( AddressList, TrackSearch ) {
	var vm = this;
	vm.list = AddressList;
    vm.searching = function() {
        return TrackSearch.GetTerm() ? true : false;
    };
}

function AddressEditController( $exceptionHandler, $state, OrderCloud, SelectedAddress, toastr, OCGeography ) {
	var vm = this,
        addressID = SelectedAddress.ID;
	vm.addressName = SelectedAddress.AddressName;
	vm.address = SelectedAddress;
    vm.countries = OCGeography.countries;
    vm.states = OCGeography.states;


	vm.Submit = function() {
		OrderCloud.Addresses.Update(addressID, vm.address)
			.then(function() {
				$state.go('addresses', {}, {reload:true});
                toastr.success('Address Updated', 'Success');
			})
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
	};

	vm.Delete = function() {
		OrderCloud.Addresses.Delete(SelectedAddress.ID, false)
			.then(function() {
				$state.go('addresses', {}, {reload:true})
                toastr.success('Address Deleted', 'Success');
			})
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
	};
}

function AddressCreateController($exceptionHandler, $state, OrderCloud, toastr, OCGeography) {
	var vm = this;
	vm.address = {};
    vm.countries = OCGeography.countries;
    vm.states = OCGeography.states;

	vm.Submit = function() {
		OrderCloud.Addresses.Create(vm.address)
			.then(function() {
				$state.go('addresses', {}, {reload:true});
                toastr.success('Address Created', 'Success');
			})
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
	};
}

function AddressAssignController($q, $scope, $state, Underscore, OrderCloud, Assignments, AssignmentsList, UserGroupList, SelectedAddress, toastr) {
    var vm = this;
    vm.list = UserGroupList;
    vm.assignments = AssignmentsList;
    vm.Address = SelectedAddress;

    $scope.$watchCollection(function() {
        return vm.list;
    }, function() {
        setSelected();
    });

    vm.setSelected = setSelected;
    function setSelected() {
        var assigned = Assignments.getAssigned(vm.assignments.Items, 'UserGroupID');
        angular.forEach(vm.list.Items, function(item) {
            if (assigned.indexOf(item.ID) > -1) {
                item.selected = true;
                var assignmentItem = Underscore.where(vm.assignments.Items, {UserGroupID: item.ID})[0];
                item.IsShipping = assignmentItem.IsShipping;
                item.IsBilling = assignmentItem.IsBilling;
            }
        });
    }

    function AssignmentFunc() {
        return OrderCloud.Addresses.ListAssignments(vm.Address.ID, null, vm.assignments.Meta.PageSize);
    }
    
    vm.saveAssignments = SaveAssignments;
    vm.pagingfunction = PagingFunction;

    function PagingFunction() {
        if (vm.list.Meta.Page < vm.list.Meta.TotalPages) {
            var queue = [];
            var dfd = $q.defer();
            queue.push(OrderCloud.UserGroups.List(null, vm.list.Meta.Page + 1, vm.list.Meta.PageSize));
            if (AssignmentFunc !== undefined) {
                queue.push(AssignmentFunc());
            }
            $q.all(queue).then(function(results) {
                dfd.resolve();
                vm.list.Meta = results[0].Meta;
                vm.list.Items = [].concat(vm.list.Items, results[0].Items);
                if (results[1]) {
                    vm.assignments.Meta = results[1].Meta;
                    vm.assignments.Items = [].concat(vm.assignments.Items, results[1].Items);
                }
                if (AssignmentFunc !== undefined) {
                    setSelected();
                }
            });
            return dfd.promise;
        }
        else return null;
    }

    function SaveAssignments() {
        var assigned = Underscore.pluck(vm.assignments.Items, 'UserGroupID');
        var selected = Underscore.pluck(Underscore.where(vm.list.Items, {selected: true}), 'ID');
        var toAdd = Assignments.getToAssign(vm.list.Items, vm.assignments.Items, 'UserGroupID');
        var toUpdate = Underscore.intersection(selected, assigned);
        var toDelete = Assignments.getToDelete(vm.list.Items, vm.assignments.Items, 'UserGroupID');
        var queue = [];
        var dfd = $q.defer();
        angular.forEach(vm.list.Items, function(Item) {
            if ((Item.IsShipping || Item.IsBilling) && toAdd.indexOf(Item.ID) > -1) {
                queue.push(OrderCloud.Addresses.SaveAssignment({
                    UserID: null,
                    UserGroupID: Item.ID,
                    AddressID: vm.Address.ID,
                    IsShipping: Item.IsShipping,
                    IsBilling: Item.IsBilling
                }));
            }
            else if (toUpdate.indexOf(Item.ID) > -1) {
                var AssignmentObject = Underscore.where(vm.assignments.Items, {UserGroupID: Item.ID})[0]; //Should be only one
                if (AssignmentObject.IsShipping !== Item.IsShipping || AssignmentObject.IsBilling !== Item.IsBilling) {
                    queue.push(OrderCloud.Addresses.SaveAssignment({
                        UserID: null,
                        UserGroupID: Item.ID,
                        AddressID: vm.Address.ID,
                        IsShipping: Item.IsShipping,
                        IsBilling: Item.IsBilling
                    }));
                }
            }
        });
        angular.forEach(toDelete, function(ItemID) {
            queue.push(OrderCloud.Addresses.DeleteAssignment(vm.Address.ID, null, ItemID));
        });
        $q.all(queue).then(function() {
            dfd.resolve();
            $state.reload($state.current);
            toastr.success('Assignment Updated', 'Success');
        });
        return dfd.promise;
    }
}