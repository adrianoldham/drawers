Array.prototype.index = function(val) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] == val) return i;
    }

    return null;
};

Array.prototype.include = function(val) {
    return this.index(val) !== null;
};

Element.addMethods({
   getChildElementsByClassName: function(element, className) {
        var array = new Array();

        element.select("." + className).each(function(e) {
            if (e.parentNode == this) {
                array.push(e);
            }
        }.bind(element));

        return array;
   }
});

var Drawers = Class.create();

Drawers.Instances = [];

Drawers.DefaultOptions = {
    triggerClass: "drawer_trigger",
    contentClass: "drawer_content",
    activeClass: "active",
    animatingClass: "animating",
    hoverClass: "hover",
    initialDrawerClass: "drawer_initial",
    duration: 0.5,
    singleDrawer: false,
    initialDrawer: false,
    drawerHeight: null,                             // if height is set then one drawer is always opened to maintain the height of the drawers
    containerHeight: null,
    drawerWidth: null,
    containerWidth: null,
    transition: Effect.Transitions.linear,
    showEvent: "click",
    hideEvent: "click",
    showEffect: Effect.BlindDown,
    hideEffect: Effect.BlindUp,
    orientation: "vertical"
};

Drawers.drawers = 0;

Drawers.Check = function () {
    var elements = $$(window.location.hash);

    // check if we have another element to scroll to
    if (Drawers.scrollToElement) elements.push(Drawers.scrollToElement);
    
    if (elements.length != 0) {
        var element = elements[0];
        
        Drawers.Instances.each(function(instance) {
            instance.openIfParentOf(element);
        });
        
        var position = element.cumulativeOffset();
        window.scrollTo(position[0], position[1]);
    }
};

Drawers.prototype = {
    initialize: function(selector, options) {
        // setup a unique id for each drawer created
        this.id = "drawer" + Drawers.drawers++;

        this.wrappers = $$(selector);
        
        if (this.wrappers.length < 1) return;

        this.options = Object.extend(Object.extend({}, Drawers.DefaultOptions), options || {});
        
        if (this.options.id != null) this.id = this.options.id;

        if (this.options.containerHeight != null || this.options.containerWidth != null) {
            this.options.singleDrawer = true;
            if (this.options.initialDrawer == false) {
                this.options.initialDrawer = true;
            }
        }

        if (typeof(this.options.initialDrawer) != "number" && this.options.initialDrawer == true) {
            this.options.initialDrawer = 0;
        }

        this.setupDrawers();
        this.getSizes();
        this.setSizes();
        this.hideContents();
        
        this.wrappers.each(function(wrapper) {
            if ($A(wrapper.classNames()).include(this.options.initialDrawerClass)) {
                this.options.initialDrawer = this.wrappers.index(wrapper);
            }
        }.bind(this));
        
        this.status = [];
        
        this.useQueryString();

        // open up initial drawer
        if (typeof(this.options.initialDrawer) == "number") {
            this.triggerContents(this.options.initialDrawer);
        }

        this.effects = [];
        
        Drawers.Instances.push(this);
    },
    
    triggerContents: function(index) {
        for (var i = 0; i < this.contents.length; i++) {
            var contents = this.contents[i];
            contents.each(function(content) {
                content.setStyle({ display: "none" });
                this.triggers[i].parentNode.classNames().remove(this.options.activeClass);
                this.status[i] = false;
            }.bind(this));
        }
        
        var contents = this.contents[index];
        contents.each(function(content) {
            content.setStyle({
                display: "block"
            });
            this.triggers[index].parentNode.classNames().add(this.options.activeClass);
            this.status[index] = true;
        }.bind(this));
    },
    
    openIfParentOf: function(element) {
        var result = null;
        
        this.wrappers.each(function(wrapper) {
            if (element.descendantOf(wrapper) || (wrapper == element)) {
                var index = this.wrappers.index(wrapper);
                this.triggerContents(index);    
            }
        }.bind(this));
        
        return result;
    },
    
    useQueryString: function() {
        var url = window.location.toString();
        
        url.match(/\?(.+)$/);
        var params = RegExp.$1;

        var params = params.split("&");

        for(var i = 0; i < params.length; i++) {
            var tmp = params[i].split("=");
            if (tmp[0] == this.id) {
                this.options.initialDrawer = parseInt(tmp[1] - 1);            
            
                if (i == params.length - 1) {
                    // scroll to if it is the last drawer
                    Drawers.scrollToElement = this.wrappers[this.options.initialDrawer];
                }
            }
        }
    },

    contentSize: function(element) {
        switch (this.options.orientation) {
            case "vertical":
                if (this.options.containerHeight != null) return this.options.containerHeight - this.triggersSize().height;
                if (this.options.drawerHeight != null) return this.options.drawerHeight;
                
                break;
            case "horizontal":
                if (this.options.containerWidth != null) return this.options.containerWidth - this.triggersSize().width;
                if (this.options.drawerWidth != null) return this.options.drawerWidth;
                
                break;
        }
        
        return null;
    },

    hideContents: function() {
        this.contents.each(function(contents) {
            contents.each(function(content) {
                content.hide();
            }.bind(this));
        }.bind(this));
    },

    getSizes: function() {
        this.sizes = [];
        this.contents.each(function(contents) {
            var contentSizes = [];

            contents.each(function(content) {
                contentSizes.push(this.contentSize(content));
            }.bind(this));

            this.sizes.push(contentSizes);
        }.bind(this));
    },

    setSizes: function() {
        this.contents.each(function(contents) {
            contents.each(function(content) {
                var size = this.sizes[this.contents.index(contents)][contents.index(content)];
                
                if (size != null) {
                    switch (this.options.orientation) {
                        case "vertical":
                            content.style.height = size + "px";
                            break;
                        case "horizontal":
                            content.style.width = size + "px";
                            content.childElements().first().style.width = size + "px";
                            break;
                    }
                }
            }.bind(this));
        }.bind(this));
    },

    setupDrawers: function() {
        this.triggers = [];
        this.contents = [];

        // loop through each toggle wrapper
        this.wrappers.each(function(wrapper) {
            var contents = new Array();

            // obtain content and triggers uses classes first
            var contentElements = wrapper.getChildElementsByClassName(this.options.contentClass);
            var triggerElements = wrapper.getChildElementsByClassName(this.options.triggerClass);

            // if can't find any then first child is trigger, second is content
            if (triggerElements.length == 0) triggerElements = [ wrapper.childElements().first() ];
            if (contentElements.length == 0) contentElements = [ wrapper.childElements()[1] ];

            // hide each content initially

            contentElements.each(function(content) {
                if (this.options.orientation == "horizontal") {                    
                    content.setStyle({ 
                        float: "left",
                        overflow: "hidden",
                        display: "block"
                    });
                    
                    var contentSizer = new Element("div");
                    contentSizer.setStyle({
                        float: "left",
                        overflow: "hidden"
                    });
                    
                    var parent = $(content.parentNode);
                    contentSizer.appendChild(content);
                    parent.appendChild(contentSizer);
                    
                    content = contentSizer;
                }
                
                contents.push(content);
            }.bind(this));

            // setup trigger events
            triggerElements.each(function(trigger) {
                if (this.options.orientation == "horizontal") trigger.setStyle({ float: "left" });
                
                trigger.style.cursor = "pointer";

                if (this.options.showEvent == this.options.hideEvent) {
                    trigger.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, null, this.options.singleDrawer, true));
                } else {
                    trigger.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, false, this.options.singleDrawer, true));
                    
                    if (!this.options.singleDrawer) {
                        trigger.observe(this.options.hideEvent, this.toggleContent.bind(this, trigger, true, this.options.singleDrawer, true));
                    }
                }

                trigger.observe("mouseover", function(event) {
                    event.target.parentNode.classNames().add(this.options.hoverClass);
                }.bind(this));

                trigger.observe("mouseout", function(event) {
                    event.target.parentNode.classNames().remove(this.options.hoverClass);
                }.bind(this));

                this.triggers.push(trigger);
                this.contents.push(contents);
            }.bind(this));
        }.bind(this));
    },

    show: function(element, options) {
        this.effects.push(this.options.showEffect(element, options));
    },

    hide: function(element, options) {
        this.effects.push(this.options.hideEffect(element, options));
    },

    triggersSize: function() {
        var size = { width: 0, height: 0 };
        this.triggers.each(function(trigger) {
            size.width += trigger.getWidth();
            size.height += trigger.getHeight();
        });
        return size;
    },

    toggle: function(element, trigger, hide) {
        // each toggle has it's own effects queue
        var triggerIndex = this.triggers.index(trigger);
        var uniqueScope = "trigger" + triggerIndex;
        var options = {
            sync: true,
            transition: this.options.transition,
            scaleX: this.options.orientation == "horizontal",
            scaleY: this.options.orientation == "vertical",
            afterSetup: function(effect) {
              var hash = {};

              if ((arguments[1] || {}).scaleX) hash.width = "0px";
              if ((arguments[1] || {}).scaleY) hash.height = "0px";

              effect.element.makeClipping().setStyle(hash).show(); 
            }
        };

        var elementHidden = this.isHidden(element);
        var shown = false;
        var hidden = false;

        if (hide == null) {
            if (elementHidden) {
                this.show(element, options);
                shown = true;
            } else {
                if (this.options.containerHeight == null) {
                    this.hide(element, options);
                    hidden = true;
                } else {
                    return false;
                }
            }
        } else if (hide && !elementHidden) {
            this.hide(element, options);
            hidden = true;
        } else if (!hide && elementHidden) {
            this.show(element, options);
            shown = true;
        }
        
        if (elementHidden && trigger.parentNode.classNames().include(this.options.activeClass)) {
            trigger.parentNode.classNames().remove(this.options.activeClass);
            this.status[triggerIndex] = false;
        }

        if (hidden) {
            trigger.parentNode.classNames().remove(this.options.activeClass);
        }
        if (shown) {
            trigger.parentNode.classNames().add(this.options.activeClass);
        }

        return false;
    },

    isHidden: function(element) {
        return element.style.display == "none";
    },

    toggleContent: function(trigger, hide, hideOthers, runEffect) {
        //if (Effect.Queues.get(this.id).size() != 0) return false;
        var testSizes;
        if (this.options.orientation == "vertical") {
            testSize = this.options.containerHeight;
        } else {
            testSize = this.options.containerWidth;
        }
        
        if (testSize != null && hideOthers && (trigger.parentNode.classNames().include(this.options.activeClass) || this.status[this.triggers.index(trigger)])) return;
        
        if (hideOthers == true) {
            Effect.Queues.get(this.id).each(function(effect){
                effect.cancel();
            });
        }

        var index = this.triggers.index(trigger);

        if (runEffect) this.effects = [];
        if (this.isHidden(this.contents[index].first())) {
            if (hideOthers) this.hideAll(false);
        }

        // toggle all contents related to the trigger
        this.contents[index].each(this.toggle.bindAsEventListener(this, trigger, hide));
        if (runEffect) this.doEffects();

        return false;
    },

    doEffects: function() {
        new Effect.Parallel(
            this.effects, {
                queue: { position: "end", scope: this.id },
                duration: this.options.duration,
                limit: 1,
                beforeStart: function(effect) {
                    effect.effects.each(function(effect) {
                        var trigger = this.findTrigger(effect.element);
                        trigger.parentNode.classNames().add(this.options.animatingClass);
            
                        var triggerIndex = this.triggers.index(trigger);

                        this.status[triggerIndex] = true;
                    }.bindAsEventListener(this));
                }.bindAsEventListener(this),
                afterFinish: function(effect) {
                    effect.effects.each(function(effect) {
                        var trigger = this.findTrigger(effect.element);
                        trigger.parentNode.classNames().remove(this.options.animatingClass);
                        
                        var triggerIndex = this.triggers.index(trigger);

                        this.status[triggerIndex] = false;
                    }.bindAsEventListener(this));
                    
                    this.setSizes();
                }.bindAsEventListener(this)
            }
        );
    },

    _toggleAll: function(hide, runEffects) {
        if (Effect.Queues.get(this.id).size() != 0) return false;
        if (runEffects == null) runEffects = true;

        if (runEffects) this.effects = [];
        this.triggers.each(this.toggleContent.bindAsEventListener(this, hide, null, false));
        if (runEffects) this.doEffects();

        return false;
    },

    // toggle all toggles based on the first triggers active-ness
    toggleAll: function(runEffects) {
        var hide = this.triggers.first().parentNode.classNames().include(this.options.activeClass);
        this._toggleAll(hide, runEffects);
        return false;
    },

    showAll: function(runEffects) {
        this._toggleAll(false, runEffects);
        return false;
    },

    hideAll: function(runEffects) {
        this._toggleAll(true, runEffects);
        return false;
    },
    
    findTrigger: function(content) {
        var trigger;
        this.contents.each(function(contents) {
            contents.each(function(_content) {
                if (content == _content) {
                    trigger = this.triggers[this.contents.index(contents)];
                }
            }.bind(this));
        }.bind(this));
        return trigger;
    }
};