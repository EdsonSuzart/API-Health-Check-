define(['app/app'], function (app) {
    'use strict';

    var controllerId = 'productDetailController'; 
    app.controller(controllerId, ['common', '$routeParams', '$rootScope', '$timeout', '$modal', '$compile', '$scope', '$filter', '$route', '$location', '$window', 'productService', 'cartService', 'signalRService', 'participantService', 'gtmService', 'availabilityService', 'orderService', 'ngDialog', 'fingerPrintService', productDetailController]);
    var moment = require('moment');

    function productDetailController(common, $routeParams, $rootScope, $timeout, $modal, $compile, $scope, $filter, $route, $location, $window, productService, cartService, signalRService, participantService, gtmService, availabilityService, orderService, ngDialog, fingerPrintService) {

        var vm = this;

        var defaultQuantityTriesFingerPrint = 10;

        vm.EnumSupplierType = {
            Ecommerce: 1,
            VoucherFisico: 2,
            VoucherVirtual: 3,
            Milhas: 4,
            Outros: 5,
            RecargaDeCelular: 6,
            VoucherVirtualExterno: 7
        };

        vm.balanceIsLoading = true;
        vm.indice = 0;
        var showLatestsPricesInterval;

        vm.model = {};
        vm.model.availability = {};
        vm.active = 'ativo';
        vm.isLoading = true;
        var selectedHigh = '';
        var selectedColor = '';
        vm.flagSkuFeatureType = '';
        vm.currentTab = 'descricao';
        vm.productSkuId = $routeParams.id || 0;
        vm.selectedSKU = vm.productSkuId;
        vm.historicalSeries = [];

        vm.size = [];
        vm.color = [];
        vm.voltage = [];
        vm.features = [];
        vm.modelBestPrice = [];
        vm.specifications = [];
        var comboColorTemp = [];
        var comboSizeTemp = [];
        vm.specialCharacteristics = [];
        var externalAvailability = true;

        vm.cSubMenuSaudacao = global.cSubmenuSaudacao;
        vm.campaignType = $rootScope.configuration.participant.campaign.campaignType;
        vm.catalogId = $rootScope.configuration.participant.catalogId;


        loadProductDetail();

        if ($rootScope.configuration.participant.catalogParameters.isPriceHistoryChartVisible == "true") {
            loadPriceHistoricalSeries();
        }

        getBalance();

        vm.includeItem = function () {
            if (vm.model.availability.isAvailable) {
                if (vm.QtdVoucherVirtual < 30) {
                    vm.QtdVoucherVirtual = vm.QtdVoucherVirtual + 1;
                }
            }
            return false;
        }

        vm.excludeItem = function () {
            if (vm.model.availability.isAvailable) {
                if ((vm.QtdVoucherVirtual - 1) > 0) {
                    vm.QtdVoucherVirtual = vm.QtdVoucherVirtual - 1;
                }
            }
            return false;
        }

        function getBalance() {
            participantService.getBalance()
                .then(function (balance) {
                    $rootScope.configuration.participant.balance = balance;
                    vm.balanceIsLoading = false;
                })
                .catch(function (error) {
                    vm.balanceIsLoading = false;
                });
        };

        function applyAvailability(productSkuId, isAvailable, sellingPrice, defaultPrice) {
            if (!vm.model.productId) {
                $timeout(function () {
                    $timeout.cancel(showLatestsPricesInterval);
                    applyAvailability(productSkuId, isAvailable, sellingPrice, defaultPrice);
                }, 500);

                return;
            }

            vm.model.availability = {
                productSkuId: productSkuId,
                isAvailable: isAvailable,
                sellingPrice: sellingPrice,
                defaultPrice: defaultPrice
            };
            vm.isLoading = false;
        }

        function loadColorAndSize() {
            vm.model.productSkus.forEach(function (productSku) {
                productSku.skuFeatures.forEach(function (featureSku) {

                    if (productSku.productSkuId === vm.productSkuId) {
                        if (featureSku.featureTypeId === 1) {
                            selectedColor = featureSku.value;
                        } else if (featureSku.featureTypeId === 2) {
                            selectedHigh = featureSku.value;
                        }
                    }
                });
            });
        }

        function loadComboVoltage() {
            vm.model.productSkus.forEach(function (productSkus) {
                productSkus.skuFeatures.forEach(function (skufeature) {

                    if (skufeature.featureTypeId === 3) {
                        vm.flagSkuFeatureType = 'voltage';

                        if (productSkus.productSkuId === vm.productSkuId) {
                            vm.voltage.unshift({
                                voltage: 'Voltage',
                                productSkuId: productSkus.productSkuId,
                                featureTypeId: skufeature.featureTypeId,
                                isKey: skufeature.isKey,
                                value: skufeature.value
                            });
                        } else {
                            vm.voltage.push({
                                voltage: 'Voltage',
                                productSkuId: productSkus.productSkuId,
                                featureTypeId: skufeature.featureTypeId,
                                isKey: skufeature.isKey,
                                value: skufeature.value
                            });
                        }
                    }
                });
            });

            if (vm.voltage.length > 0) {
                vm.voltageSelected = vm.voltage[0];
            }
        }

        function applyTimeout() {
            if (showLatestsPricesInterval)
                $timeout.cancel(showLatestsPricesInterval);

            showLatestsPricesInterval = $timeout(function () {
                applyAvailability(vm.productSkuId, false, 0, 0);
            }, global.showShowCaseLatestsPriceInterval);
        }

        function loadPriceHistoricalSeries() {
            productService.getPriceHistoricalSeries(vm.productSkuId, vm.catalogId)
                .success(function (data) {

                    if (data == null || data.length < 5) {
                        $(".pg-historico-preco").hide();
                        return;
                    }
                    vm.historicalSeries = data;
                    var config = {
                        type: 'line',
                        data: {
                            labels: data.map(function (d) { moment(d.date).format('DD/MM/YYYY') }),
                            datasets: [{
                                backgroundColor: 'RGBA(38, 143, 204, 0.4)',
                                borderColor: 'RGBA(0, 50, 96, 0.8)',
                                borderWidth: 2,
                                lineTension: 0,
                                fill: true,
                                data: data.map(function (d) { return { x: d.date, y: d.price } }),
                            }]
                        },
                        options: {
                            title: {
                                text: 'Histórico de preços'
                            },
                            legend: {
                                display: false
                            },
                            scales: {
                                xAxes: [{
                                    scaleLabel: {
                                        display: true,
                                    }
                                }],
                                yAxes: [{
                                    scaleLabel: {
                                        display: true,
                                    }
                                }]
                            },
                        }
                    };

                    var ctx = document.getElementById('priceHistoryCanvas').getContext('2d');
                    window.myLine = new Chart(ctx, config);
                });
        }

        function loadProductDetail() {

            productService.getDetail(vm.productSkuId, externalAvailability == false)
                .success(function (data) {
                    gtmService.traceProduct(data);

                    vm.model = data;
                    vm.model.descriptions = $filter('formatDescription')(vm.model.description);

                    if (vm.model.supplierType === vm.EnumSupplierType.VoucherVirtual || vm.model.supplierType === vm.EnumSupplierType.VoucherVirtualExterno)
                        initVorucherVirtual();

                    for (var i in $rootScope.configuration.participant.vendors) {
                        if ($rootScope.configuration.participant.vendors.hasOwnProperty(i)) {
                            if ($rootScope.configuration.participant.vendors[i].id === vm.model.vendorId) {

                                vm.model.supplierName = $rootScope.configuration.participant.vendors[i].name
                                    .toLowerCase();
                                vm.model
                                    .supplierUrlName =
                                    encodeURIComponent($rootScope.configuration.participant.vendors[i].urlName
                                        .toLowerCase());
                                vm.model.supplierImage = $rootScope.configuration.participant.vendors[i].imageUrl;
                            }
                        }
                    }


                    for (var isect in data.sections) {
                        if (data.sections.hasOwnProperty(isect)) {
                            var section = data.sections[isect];

                            if (section.sectionTypeId === 1) {
                                vm.model.category = section.name;
                                vm.model.categoryUrl = section.nameUrl;
                                vm.model.categoryId = section.sectionId;
                            }

                            if (section.sectionTypeId === 2) {
                                vm.model.subcategory = section.name;
                                vm.model.subcategoryUrl = section.nameUrl;
                                vm.model.subcategoryId = section.sectionId;
                            }

                            if (section.sectionTypeId === 3) {
                                vm.model.brand = section.name;
                                vm.model.brandUrl = section.nameUrl;
                                vm.model.brandId = section.sectionId;
                            }
                        }
                    }

                    loadComboColorAndSize();

                    loadspecifications();

                    loadspecialCharacteristics();

                    vm.searchSize(selectedColor);

                    loadComboVoltage();

                    cartService.getCart()
                        .success(function (dataCart) {
                            vm.model.cart = {};
                            vm.model.cart = dataCart;
                        });

                    if (vm.model.defaultSku.skuImages && vm.model.defaultSku.skuImages.length > 0) {
                        vm.banner = vm.model.defaultSku.skuImages[0].mediumImage;
                        vm.largeImage = vm.model.defaultSku.skuImages[0].largeImage;
                        vm.model.defaultSku.skuImages[0].css = 'ativo';
                    } else {
                        vm.banner = "/content/images/Layout/produtoSemImagem.png";
                        vm.largeImage = "";
                        vm.model.defaultSku.skuImages = [];
                        vm.model.defaultSku.skuImages.push({
                            css: "ativo",
                            smallImage: "/content/images/Layout/produtoSemImagem.png",
                            mediumImage: "/content/images/Layout/produtoSemImagem.png",
                            largeImage: ""
                        });
                    }
                    window.dataLayer.push({
                        'event': 'event',
                        'eventCategory': 'produto:miniatura',
                        'eventAction': 'load',
                        'eventLabel': vm.banner
                    });




                    SetAvailability();
                    vm.isLoading = false;
                });
        }

        function SetAvailability() {

            var productSkuId = vm.productSkuId;
            var vendorId = vm.model.defaultSku.vendorId;
            var originalProductId = vm.model.defaultSku.originalProductSkuId;

            var catalogId = $rootScope.configuration.participant.catalogId;
            availabilityService.getAvailabilities(catalogId, productSkuId, vendorId, originalProductId)
                .then(function (data) {
                    if (data.data[0].productSkuId) {
                        data = data.data[0];

                        vm.model.availability = {
                            productSkuId: data.productSkuId,
                            isAvailable: data.isAvailable,
                            sellingPrice: data.sellingPrice,
                            defaultPrice: data.defaultPrice
                        };
                    }
                });

        }

        function loadspecifications() {
            if (vm.model.supplierType !== vm.EnumSupplierType.VoucherFisico || vm.model.supplierType === vm.EnumSupplierType.VoucherVirtualExterno) {
                vm.specifications = vm.model.productFeatures.filter(function (feature) {
                    return feature.featureTypeId == 6;
                });
            }
        }

        function loadComboColorAndSize() {

            loadColorAndSize();
            vm.model.productSkus.forEach(function (productSku) {
                //Inicio: correção bug de seleção de tamanhos
                if (productSku.skuFeatures.length == 1 && productSku.skuFeatures[0].featureTypeId === 1) {
                    vm.flagSkuFeatureType = 'color';
                    vm.disabledSize = false;
                    comboColorTemp.push({
                        ComboCor: "ComboCor",
                        originalProductSkuId: productSku.originalProductSkuId,
                        productSkuId: productSku.productSkuId,
                        featureTypeId: productSku.skuFeatures[0].featureTypeId,
                        isKey: productSku.skuFeatures[0].isKey,
                        value: productSku.skuFeatures[0].value
                    });
                }
                else {
                    productSku.skuFeatures.forEach(function (skufeature) {

                        if (skufeature.featureTypeId === 1) {

                            vm.flagSkuFeatureType = 'colorAndSize';
                            comboColorTemp.push({
                                ComboCor: "ComboCor",
                                originalProductSkuId: productSku.originalProductSkuId,
                                productSkuId: productSku.productSkuId,
                                featureTypeId: skufeature.featureTypeId,
                                isKey: skufeature.isKey,
                                value: skufeature.value
                            });
                        }
                        else if (skufeature.featureTypeId === 2) {
                            vm.flagSkuFeatureType = 'colorAndSize';
                            comboSizeTemp.push({
                                ComboTam: "ComboTam",
                                originalProductSkuId: productSku.originalProductSkuId,
                                productSkuId: productSku.productSkuId,
                                featureTypeId: skufeature.featureTypeId,
                                isKey: skufeature.isKey,
                                value: skufeature.value

                            });
                        }

                    });
                }
            });


            vm.color = removeColorsDuplicateInArrayObjects(comboColorTemp);
        }

        function loadspecialCharacteristics() {
            if (vm.model.supplierType !== vm.EnumSupplierType.VoucherFisico || vm.model.supplierType === vm.EnumSupplierType.VoucherVirtualExterno) {
                vm.specialCharacteristics = vm.model.productFeatures.filter(function (feature) {
                    return feature.featureTypeId == 5;
                });
            }
        }

        function removeColorsDuplicateInArrayObjects(sourceArrayObject) {
            return sourceArrayObject.reduce(function (a, b) {
                function indexOfProperty(a, b) {
                    for (var i = 0; i < a.length; i++) {
                        if (a[i].value === b.value) {
                            return i;
                        }
                    }
                    return -1;
                }

                if (indexOfProperty(a, b) < 0)
                    a.push(b);
                return a;
            }, []);
        }


        function initVorucherVirtual() {
            vm.QtdVoucherVirtual = 1;

            for (var a2 in $rootScope.configuration.participant.email) {
                if ($rootScope.configuration.participant.email.hasOwnProperty(a2)) {
                    if ($rootScope.configuration.participant.email[a2].emailType === 1)
                        vm.email = $rootScope.configuration.participant.email[a2].emailText;
                }
            }

            if (!vm.email || vm.email === "") {
                for (var a3 in $rootScope.configuration.participant.email) {
                    if ($rootScope.configuration.participant.email.hasOwnProperty(a3)) {
                        if ($rootScope.configuration.participant.email[a3].emailType === 2)
                            vm.email = $rootScope.configuration.participant.email[a3].emailText;
                    }
                }
            }
        }

        var closeEvent = function () {
            closeDialog();
        };

        var closeDialog = function () {
            ngDialog.closeAll();

            var x = document.querySelector("#header");
            if (x.removeEventListener) {                   // For all major browsers, except IE 8 and earlier
                x.removeEventListener("click", closeEvent);
            } else if (x.detachEvent) {                    // For IE 8 and earlier versions
                x.detachEvent("click", closeEvent);
            }
        };

        function confirmAddCart(value) {

            var template = '</br><p>Você selecionou a voltagem: <b>' + value + '</b>, deseja confirmar?</p></br>' +
                '<div class="ngdialog-buttons">' +
                '<button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog()">Não</button>' +
                '<button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm()">Sim</button>' +
                '</div>';

            document.querySelector('#header').addEventListener('click', closeEvent);
            ngDialog.openConfirm({
                template: template,
                plain: true,
                className: 'ngdialog-theme-default',
                scope: $scope,
                backdrop: 'static'
            }).then(function (value) {
                return addCartConfirmed();
            });
        }

        vm.addCart = function () {
            if (vm.flagSkuFeatureType == 'voltage') {
                if (vm.voltageSelected) {
                    return confirmAddCart(vm.voltageSelected.value);
                }
            }

            return addCartConfirmed();
        }

        function addCartConfirmed() {
            if (vm.disabledColor && (!vm.Cor || vm.Cor == "")) {
                common.simpleErrorMessage('Escolher a Cor é obrigatório.');
                return;
            }

            if (vm.disabledSize && (!vm.Size || vm.Size == "")) {
                common.simpleErrorMessage('Escolha um tamanho.');
                return;
            }
            cartService.buyDetailProduct(vm.model, 1)
                .success(function () {
                    $location.path('/carrinho');
                });
        }

        vm.addCartVirtual = function () {
            if (!vm.email) {
                common.simpleErrorMessage('Digite seu e-mail.');
                return;
            } else {
                if (!common.isValidEmail(vm.email)) {
                    common.simpleErrorMessage('O e-mail parece incorreto. Verifique e tente novamente.');
                    return;
                }
            }

            vm.model.QtdVoucherVirtual = vm.QtdVoucherVirtual;
            vm.model.Email = vm.email;


            if (vm.model.supplierType === vm.EnumSupplierType.VoucherVirtualExterno) {
                cartService.buyDetailProduct(vm.model, vm.QtdVoucherVirtual)
                    .success(function () {
                        $location.path('/carrinho');
                    });
                return;
            }

            cartService.buyVirtualItem(vm.model, true)
                .success(function () {

                    //Chamar validacao de saldo
                    orderService.validateFundsPurchaseForVirtualVoucher()
                        .success(function (data) {
                            $location.path('/carrinho/pagamento/VoucherVirtual');
                        })
                        .error(function (error) {
                            common.errorMessageModel(error);
                        });
                });
        }

        vm.needToDisableField = function (document, fielType) {

            var bloq = false;

            if (document == undefined || document == null || document != 'true')
                return bloq;
            else {

                bloq = true;

                if (vm.model.address && fielType == 'true')
                    return !isAddressNull;

                return bloq;
            }
        }

        vm.getKeyWord = function () {
            if (vm.search && vm.search.term)
                $location.path('/busca/' + vm.model.vendorId + '/' + $filter('friendlyurl')(vm.model.supplierName) + '/palavrachave=' + encodeURIComponent(vm.search.term));
        }

        vm.selectImage = function (item) {
            vm.banner = item.mediumImage;
            vm.largeImage = item.largeImage;

            if (vm.largeImage) {
                $("#productImage").data('zoom-image', item.largeImage).elevateZoom({
                    responsive: true,
                    zoomType: "window",
                    containLensZoom: true
                });
            }

            for (var i in vm.model.defaultSku.skuImages)
                vm.model.defaultSku.skuImages[i].css = 'inativo';

            item.css = 'ativo';
        }

        vm.selectedFeature = function () {

            var isCor = false;
            var isSize = false;
            var isRedirect = false;

            vm.model.productSkus.forEach(function (productSku) {


                var filter = productSku.skuFeatures.filter(function (features) {

                    if (features.featureTypeId === 1 && features.value === vm.Cor) {
                        isCor = true;
                    }
                    else if (features.featureTypeId === 2 && features.value === vm.Size) {
                        isSize = true;
                    }

                    if (isCor && isSize) {
                        isRedirect = true;
                    }

                    return isRedirect;

                });

                isSize = false;
                isCor = false;

                if (filter && filter.length >= 1 && productSku.productSkuId !== vm.productSkuId && isRedirect) {
                    isRedirect = false;
                    $location.path("/produto/" + $filter('friendlyurl')(vm.model.name) + "/" + productSku.productSkuId);

                }


            });
        }

        vm.changeTab = function (currentTab) {
            vm.currentTab = currentTab;
        }

        vm.breadCrumbSubcategory = function (id) {
            $location.path('/busca/' + vm.model.supplierName + '/subcategoria=' + id);
        }

        vm.searchSize = function (corSelecionada) {
            var colors = [];

            vm.model.productSkus.forEach(function (productSku) {

                var color1;
                var color2;

                productSku.skuFeatures.forEach(function (skuFeature) {
                    if (skuFeature.featureTypeId === 1 && skuFeature.value === corSelecionada) {
                        color1 = skuFeature;
                    }

                    if (skuFeature.featureTypeId === 2) {
                        color2 = skuFeature;
                    }
                });

                if (color1 !== undefined) {
                    colors.push(color2);
                }
            });

            //Ordenação para (A1 .. A1) e (Números)
            vm.size = colors.length === 0 ? comboSizeTemp : colors.sort(function (a, b) {
                var one = parseInt(a.value.replace("A", ""));
                var two = parseInt(b.value.replace("A", ""));

                if (one < two) return -1;
                if (one > two) return 1;
                return 0;
            });

            var orderSize = ["PP", "P", "M", "G", "GG", "EG", "XG"];
            var newOrderSize = [];
            var i = 0;

            //Ordenação para (PP, P, M .. GG)
            if (vm.disabledSize && (!vm.Size || vm.Size == "")) {

                //Ordenação para (PP, P, M .. GG)
                $(orderSize).each(function () {
                    var size = vm.size.filter(function (el) {
                        if (el) {
                            return el ? el.value == orderSize[i] : null;
                        }
                    })[0];

                    if (size != undefined)
                        newOrderSize.push(size);

                    i++;
                });
            }

            if (newOrderSize.length != 0)
                vm.size = newOrderSize;

            vm.Cor = corSelecionada;

            vm.disabledSize = vm.size.length === 0 || vm.size[0] === undefined ? false : true;
            vm.disabledColor = vm.color.length === 0 ? false : true;


            if (corSelecionada !== selectedColor)
                vm.Size = "";
            else
                vm.Size = selectedHigh;
        }

        vm.breadCrumbCategory = function (id, name) {
            $location.path('/' + vm.model.supplierName + '/departamento/' + id + '/' + name);
        }

        vm.selectFeatureVoltage = function (voltage) {
            vm.voltageSelected = voltage;
            if (voltage.productSkuId !== vm.productSkuId)
                $location.path("/produto/" + $filter('friendlyurl')(vm.model.name) + "/" + voltage.productSkuId);
        }

        vm.selectColor = function (corSelecionada) {
            var productSkuId = "";
            vm.model.productSkus.forEach(function (productSku) {
                if (productSku.skuFeatures[0].featureTypeId === 1 && productSku.skuFeatures[0].value === corSelecionada) {
                    productSkuId = productSku.productSkuId;
                    return;
                }
            });

            if (productSkuId !== vm.productSkuId) {
                $location.path("/produto/" + $filter('friendlyurl')(vm.model.name) + "/" + productSkuId);
            }
        }

        function fingerPrintAccess(numTries) {
            var getfingerPrint = $('#nameinputhidden').val();
            if (getfingerPrint) {
                fingerPrintService.sendFingerPrintAccess(getfingerPrint, true);
            } else if (numTries < defaultQuantityTriesFingerPrint) {
                return setTimeout(function () {
                    fingerPrintAccess(numTries + 1);
                }, 1000);
            }
        }

        $(document).ready(function () {
            var numTries = 0;
            fingerPrintAccess(numTries);
        });
    }
});