/**
* The MIT License (MIT)
*
* Copyright (c) 2014 Sebastian Nette
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*
* 
*
*/

/**
 * ###################################################### USAGE ######################################################
 *
 * 1. Load three.interactionmanager.js
 * 2. Initialize the Interaction Manager
 *    - THREE.Object3D.InteractionManager = new THREE.InteractionManager(camera, renderer);
 * 3. Mesh.on('mousedown', function() { alert("mousedown!"); });
 *
 * ###################################################################################################################
 */

/**
 * THREE InteractionManager
 * Copyright (c) 2014, Sebastian Nette
 * http://www.mokgames.com/
 */

if (typeof Function.prototype.bind !== 'function') {
    Function.prototype.bind = function (bind) {
        var self = this;
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return self.apply(bind || null, args);
        };
    };
}

// check namespace
if(THREE.InteractionData || THREE.InteractionManager)
{
    throw new Error('This Plugin is not useabled with your THREE.js version.');
}

THREE.InteractionData = function()
{
    this.x = 0;
    this.y = 0;
    this.target = null;
    this.originalEvent = null;
    this.touchEvent = null;
    this.toPropagate = false;
    this.eventName = "";
    this.intersect = null;
};

THREE.InteractionData.prototype.constructor = THREE.InteractionData;

THREE.InteractionData.prototype.stopPropagation = function()
{
    this.toPropagate = false;
};

THREE.InteractionData.prototype.preventDefault = function()
{
    this.originalEvent && this.originalEvent.preventDefault();
};

// # Constructor
THREE.InteractionManager = function(camera, renderer, domElement)
{
    this.mouse = new THREE.InteractionData();
    
    this.touches = {};

    this.pool = [];

    this.interactiveItems = {};

    this.interactionCamera = null;

    this.renderer = null;

    this.interactionDOMElement = null;

    this.currentCursorStyle = 'inherit';

    this.selected  = null;

    this.enabled = true;

    this.scene = null;

    this.onClick = this.onClick.bind(this);
    this.onDblClick = this.onDblClick.bind(this);
    
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    
    this.onContextmenu = this.onContextmenu.bind(this);

    if(domElement === undefined && renderer.domElement)
    {
        domElement = renderer.domElement;
    }

    this.setCamera(camera);
    this.setRenderer(renderer, !!domElement);
    this.setTargetDomElement(domElement);
};

THREE.InteractionManager.noop = function()
{
};

THREE.InteractionManager.prototype.constructor = THREE.InteractionManager;

THREE.InteractionManager.prototype.disable  = function()
{
    this.enabled = false;
};

THREE.InteractionManager.prototype.enable  = function()
{
    this.enabled = true;
};

// # Destructor
THREE.InteractionManager.prototype.destroy  = function()
{
    this.setCamera(null);
    this.removeEvents(null);
    this.setRenderer(null, false);

    this.mouse = new THREE.InteractionData();
    this.touches = {};
    this.pool = [];
    this.scene = null;

    this.interactiveItems = {};
};

THREE.InteractionManager.prototype.setCamera = function(camera)
{
    this.interactionCamera = camera;
};

THREE.InteractionManager.prototype.setRenderer = function(renderer, setDomElement)
{
    this.renderer = renderer;

    if(setDomElement)
    {
        this.setTargetDomElement(renderer.domElement);
    }
};

THREE.InteractionManager.prototype.setTargetDomElement = function(domElement)
{
    this.removeEventListeners();

    if (window.navigator.msPointerEnabled)
    {
        // time to remove some of that zoom in ja..
        domElement.style['-ms-content-zooming'] = 'none';
        domElement.style['-ms-touch-action'] = 'none';
    }

    this.interactionDOMElement = domElement;

    domElement.addEventListener('mousemove',  this.onMouseMove, true);
    domElement.addEventListener('mousedown',  this.onMouseDown, true);
    domElement.addEventListener('mouseout',   this.onMouseOut, true);

    // aint no multi touch just yet!
    domElement.addEventListener('touchstart', this.onTouchStart, true);
    domElement.addEventListener('touchend', this.onTouchEnd, true);
    domElement.addEventListener('touchmove', this.onTouchMove, true);

    domElement.addEventListener('contextmenu', this.onContextmenu, true);
    domElement.addEventListener('dblclick', this.onDblClick, true);
    domElement.addEventListener('click', this.onClick, true);

    window.addEventListener('mouseup',  this.onMouseUp, true);
};

THREE.InteractionManager.prototype.removeEventListeners = function()
{
    if (!this.interactionDOMElement) return;

    this.interactionDOMElement.style['-ms-content-zooming'] = '';
    this.interactionDOMElement.style['-ms-touch-action'] = '';

    this.interactionDOMElement.removeEventListener('mousemove',  this.onMouseMove, true);
    this.interactionDOMElement.removeEventListener('mousedown',  this.onMouseDown, true);
    this.interactionDOMElement.removeEventListener('mouseout',   this.onMouseOut, true);

    // aint no multi touch just yet!
    this.interactionDOMElement.removeEventListener('touchstart', this.onTouchStart, true);
    this.interactionDOMElement.removeEventListener('touchend', this.onTouchEnd, true);
    this.interactionDOMElement.removeEventListener('touchmove', this.onTouchMove, true);

    this.interactionDOMElement.removeEventListener('contextmenu', this.onContextmenu, true);
    this.interactionDOMElement.removeEventListener('dblclick', this.onDblClick, true);
    this.interactionDOMElement.removeEventListener('click', this.click, true);

    this.interactionDOMElement = null;

    window.removeEventListener('mouseup',  this.onMouseUp, true);
};

THREE.InteractionManager.prototype.bind = function(object3d, eventName, callback, useCapture)
{
    // multi bindings
    if(eventName.indexOf(' ') !== -1)
    {
        var events = eventName.split(' ');
        while(eventName = events.pop())
        {
            this.bind(object3d, eventName, callback, useCapture);
        }
        return;
    }

    // namespace
    var namespace = null;
    if(eventName.indexOf('.') !== -1)
    {
        var data = eventName.split('.');
        eventName = data[0];
        namespace = data[1]; // todo implement namespacing
    }

    // check atlas
    eventName = THREE.InteractionManager.Atlas[eventName] || eventName;

    // check if valid event name
    console.assert(THREE.InteractionManager.eventNames.indexOf(eventName) !== -1, "not available events:" + eventName);

    if(object3d.events === undefined)
    {
        object3d.events = {};
    }

    if(object3d.events[eventName] === undefined)
    {
        object3d.events[eventName] = [];
    }

    object3d.events[eventName].push({
        callback: callback,
        useCapture: !!useCapture,
        namespace: namespace
    });

    // make whole scene interactive
    if(object3d instanceof THREE.Scene && !this.scene)
    {
        this.scene = object3d;
    }

    if(this.interactiveItems[eventName] === undefined)
    {
        this.interactiveItems[eventName] = [];
    }

    if(this.interactiveItems[eventName].indexOf(object3d) === -1)
    {
        this.interactiveItems[eventName].push(object3d);
    }

    // bind an empty mousemove on over/out
    if(eventName === 'mouseover' || eventName === 'mouseout')
    {
        var bound = this.bound('mousemove', object3d);
        if(!bound || !bound.length)
        {
            this.bind(object3d, 'mousemove', THREE.InteractionManager.noop);
        }
    }
};

THREE.InteractionManager.prototype.unbind = function(object3d, eventName, callback, useCapture)
{
    // multi unbindings
    if(eventName.indexOf(' ') !== -1)
    {
        var events = eventName.split(' ');
        while(eventName = events.pop())
        {
            this.unbind(object3d, eventName, callback, useCapture);
        }
        return;
    }

    // namespace
    var namespace = null;
    if(eventName.indexOf('.') !== -1)
    {
        var data = eventName.split('.');
        eventName = data[0];
        namespace = data[1]; // todo implement namespacing
    }

    // check atlas
    eventName = THREE.InteractionManager.Atlas[eventName] || eventName;

    // check if valid event name
    console.assert(THREE.InteractionManager.eventNames.indexOf(eventName) !== -1, "not available events:" + eventName);

    if(!object3d.events || !object3d.events[eventName])
    {
        return;
    }

    var handlers = object3d.events[eventName],
        handler;
    
    for(var i = handlers.length - 1; i >= 0; i--)
    {
        handler = handlers[i];
        if(callback === undefined)
        {
            if(!namespace || handler.namespace === namespace)
            {
                handlers.splice(i, 1);
            }
        }
        else if(useCapture === undefined)
        {
            if(handler.callback === callback && handler.namespace === namespace)
            {
                handlers.splice(i, 1);
            }
        }
        else
        {
            if(handler.callback === callback && handler.useCapture === useCapture && handler.namespace === namespace)
            {
                handlers.splice(i, 1);
            }
        }
    }

    if(!handlers.length && this.interactiveItems[eventName])
    {
        var index = this.interactiveItems[eventName].indexOf(object3d);
        if(index !== -1)
        {
            this.interactiveItems[eventName].splice(index, 1);
        }
    }

    // remove empty mousemove if no over/out left
    if(eventName === 'mouseover' || eventName === 'mouseout')
    {
        var boundOut = this.bound('mouseout', object3d);
        var boundOver = this.bound('mouseout', object3d);
        if((!boundOut || !boundOut.length) && (!boundOver || !boundOver.length))
        {
            this.unbind(object3d, 'mousemove', THREE.InteractionManager.noop);
        }
    }

    // remove scene interactions
    if(object3d instanceof THREE.Scene && this.scene && this.scene.events)
    {
        for(var prop in this.scene.events)
        {
            if(this.scene.events[prop].length)
            {
                return;
            }
        }
        this.scene = null;
    }
};

THREE.InteractionManager.prototype.addEventListener = THREE.InteractionManager.prototype.bind;
THREE.InteractionManager.prototype.removeEventListener = THREE.InteractionManager.prototype.unbind;

THREE.InteractionManager.prototype.removeEvents = function(object3d)
{
    this.unbind(object3d, THREE.InteractionManager.eventNamesString);
    if(object3d.events)
    {
        delete object3d.events;
    }
};

THREE.Object3D.prototype.on = function(eventName, callback, useCapture)
{
    if(THREE.Object3D.InteractionManager !== undefined)
    {
        THREE.Object3D.InteractionManager.bind(this, eventName, callback, useCapture);
    }
    else
    {
        console.log("InteractionManager must be initialized as: THREE.Object3D.InteractionManager = new THREE.InteractionManager(camera, renderer);");
    }
    return this;
};

THREE.Object3D.prototype.off = function(eventName, callback, useCapture)
{
    if(THREE.Object3D.InteractionManager !== undefined)
    {
        THREE.Object3D.InteractionManager.unbind(this, eventName, callback, useCapture);
    }
    else
    {
        console.log("InteractionManager must be initialized as: THREE.Object3D.InteractionManager = new THREE.InteractionManager(camera, renderer);");
    }
    return this;
};

THREE.Object3D.prototype.removeEvents = function()
{
    if(THREE.Object3D.InteractionManager !== undefined)
    {
        THREE.Object3D.InteractionManager.removeEvents(this);
    }
    else
    {
        console.log("InteractionManager must be initialized as: THREE.Object3D.InteractionManager = new THREE.InteractionManager(camera, renderer);");
    }
    return this;
};

/**
 * [read-only] Indicates if the sprite is globally visible.
 *
 * @property worldVisible
 * @type Boolean
 */
Object.defineProperty(THREE.Object3D.prototype, 'worldVisible', {
    get: function() {
        var item = this;

        do
        {
            if(!item.visible)return false;
            item = item.parent;
        }
        while(item);

        return true;
    }
});

THREE.InteractionManager.eventNames = [
    "click",
    "dblclick",
    "mouseover",
    "mouseout",
    "mousemove",
    "touchmove",
    "mousedown",
    "touchstart",
    "mouseup",
    "touchend",
    "mouseupoutside",
    "touchendoutside",
    "contextmenu",
    "rightup",
    "rightclick",
    "rightupoutside",
    "rightdown"
];
THREE.InteractionManager.eventNamesString = THREE.InteractionManager.eventNames.join(' ');

THREE.InteractionManager.Atlas = {
    tap: 'click',
    dbltap: 'dblclick'
};

THREE.InteractionManager.AUTO_PREVENT_DEFAULT = true;

THREE.InteractionManager.prototype.intersect = (function()
{
    var raycaster = new THREE.Raycaster();
    var vector = new THREE.Vector3();

    var rect = null;
    var time = 0;
    var delay = 500;
    var _w, _h;

    return function(event, items, data, touchEvent)
    {
        data.originalEvent = event;
        data.touchEvent = touchEvent || null;

        // TODO optimize by not check EVERY TIME! maybe half as often? //
        var now = Date.now();
        if(time < now)
        {
            rect = this.interactionDOMElement.getBoundingClientRect();
            time = now + delay;
            _w = (this.interactionDOMElement.width / rect.width);
            _h = (this.interactionDOMElement.height / rect.height);
        }

        if(touchEvent)
        {
            //Support for CocoonJS fullscreen scale modes
            if (navigator.isCocoonJS && !rect.left && !rect.top && !event.target.style.width && !event.target.style.height)
            {
                data.x = touchEvent.clientX;
                data.y = touchEvent.clientY;
            }
            else
            {
                data.x = (touchEvent.clientX - rect.left) * _w;
                data.y = (touchEvent.clientY - rect.top) * _h;
            }
        }
        else
        {
            data.x = (event.clientX - rect.left) * _w;
            data.y = (event.clientY - rect.top) * _h;
        }

        var camera = this.interactionCamera;

        vector.set( (data.x / (rect.width || this.interactionDOMElement.width)) * 2 - 1, -(data.y / (rect.height || this.interactionDOMElement.height)) * 2 + 1, 0.5 );
        vector.unproject( camera );

        raycaster.ray.set( camera.position, vector.sub( camera.position ).normalize() );

        if(this.scene)
        {
            var intersects = raycaster.intersectObjects(items);
                intersects.push({ object: this.scene });
            return intersects;
        }

        return raycaster.intersectObjects(items);
    };
})();

THREE.InteractionManager.prototype.bound = function(eventName, object3d)
{
    return object3d && object3d.events && object3d.events[eventName];
};


THREE.InteractionManager.prototype.dispatch = function(eventName, object3d, intersect, data)
{
    var handlers = this.bound(eventName, object3d);

    // do bubbling
    if(!handlers || !handlers.length){
        object3d.parent && this.dispatch(eventName, object3d.parent, intersect);
        return;
    }

    data = data || this.mouse;
  
    // notify all handlers
    var handler;
    for(var i = handlers.length -1; i >= 0; i--)
    {
        handler = handlers[i];
        
        data.eventName = eventName;
        data.target = object3d;
        data.toPropagate = true;
        data.intersect = intersect;

        handler.callback(data);
        
        if(!data.toPropagate)
        {
            continue;
        }
        // do bubbling
        if(!handler.useCapture)
        {
            object3d.parent && this.dispatch(eventName, object3d.parent, intersect, data);
        }
    }
};

THREE.InteractionManager.prototype.onMouseMove = function(event, data)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }

    var items = this.interactiveItems.mousemove;
    if(!items || !items.length)
    {
        return;
    }

    var intersects = this.intersect(event, items, data || this.mouse);
      
    if(intersects.length)
    {
        var intersect;
        for(var i = intersects.length - 1; i >= 0; i--)
        {
            intersect = intersects[i];
            if(intersect === this.selected)
            {
                out = false;
            }
        
            this.dispatch('mousemove', intersect.object, intersect);

            if(!i)
            {
                var selected = intersect.object;

                if(this.selected && this.selected !== selected)
                {
                    this.dispatch('mouseout', this.selected, null);
                }
                
                if(this.selected !== selected)
                {
                    this.dispatch('mouseover', selected, intersect);
                    this.selected = selected;
                }
            }
        }
    }
    else
    {
        this.selected && this.dispatch('mouseout', this.selected, null);
        this.selected = null;
    }
};

THREE.InteractionManager.prototype.onMouseDown = function(event, data)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }
    
    var isRightButton = event.button === 2 || event.which === 3;
    var downFunction = isRightButton ? 'rightdown' : 'mousedown';
    var isDown = isRightButton ? '__isRightDown' : '__isDown';

    var items = this.interactiveItems[downFunction];
    if(!items || !items.length)
    {
        return;
    }

    var intersects = this.intersect(event, items, data || this.mouse);
      
    if(intersects.length)
    {
        var intersect;
        for(var i = intersects.length - 1; i >= 0; i--)
        {
            intersect = intersects[i];
            intersect.object[isDown] = true;
            this.dispatch(downFunction, intersect.object, intersect);
        }
    }
};

THREE.InteractionManager.prototype.onMouseUp = function(event, data)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }

    var isRightButton = event.button === 2 || event.which === 3;
    var upFunction = isRightButton ? 'rightup' : 'mouseup';
    var upOutsideFunction = isRightButton ? 'rightupoutside' : 'mouseupoutside';
    var isDown = isRightButton ? '__isRightDown' : '__isDown';
    var i;

    var items = this.interactiveItems[upFunction];
    if(items && items.length)
    {
        var intersects = this.intersect(event, items, data || this.mouse);
          
        if(intersects.length)
        {
            var intersect;
            for(i = intersects.length - 1; i >= 0; i--)
            {
                intersect = intersects[i];
                intersect.object[isDown] = false;
                this.dispatch(upFunction, intersect.object, intersect);
            }
        }
    }

    var outsideItems = this.interactiveItems[upOutsideFunction];
    if(outsideItems && outsideItems.length)
    {
        for(i = outsideItems.length - 1; i >= 0; i--)
        {
            intersect = outsideItems[i];
            if(intersect[isDown])
            {
                this.dispatch(upOutsideFunction, intersect, null);
                intersect[isDown] = false;
            }
        }
    }
};

THREE.InteractionManager.prototype.onClick = function(event, data)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }
    
    var items = this.interactiveItems.click;
    if(!items || !items.length)
    {
        return;
    }

    var intersects = this.intersect(event, items, data || this.mouse);
      
    if(intersects.length)
    {
        var intersect;
        for(var i = intersects.length - 1; i >= 0; i--)
        {
            intersect = intersects[i];
            this.dispatch('click', intersect.object, intersect);
        }
    }
};

THREE.InteractionManager.prototype.onDblClick = function(event, data)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }
    
    var items = this.interactiveItems.dblclick;
    if(!items || !items.length)
    {
        return;
    }

    var intersects = this.intersect(event, items, data || this.mouse);
      
    if(intersects.length)
    {
        var intersect;
        for(var i = intersects.length - 1; i >= 0; i--)
        {
            intersect = intersects[i];
            this.dispatch('dblclick', intersect.object, intersect);
        }
    }
};

THREE.InteractionManager.prototype.onContextmenu = function(event, data)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }
    
    var items = this.interactiveItems.contextmenu;
    if(!items || !items.length)
    {
        return;
    }

    var intersects = this.intersect(event, items, data || this.mouse);
      
    if(intersects.length)
    {
        var intersect;
        for(var i = intersects.length - 1; i >= 0; i--)
        {
            intersect = intersects[i];
            this.dispatch('contextmenu', intersect.object, intersect);
        }
    }
};

THREE.InteractionManager.prototype.onTouchMove = function(event)
{
    if(!this.enabled)
    {
        return;
    }
    
    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }

    var items = this.interactiveItems.touchmove;
    if(!items || !items.length)
    {
        return;
    }

    var changedTouches = event.changedTouches;
    var touchEvent;
    var touchData;
    var i = 0;
    var intersects;
    var intersect;
    var j = 0;

    for (i = 0; i < changedTouches.length; i++)
    {
        touchEvent = changedTouches[i];
        touchData = this.touches[touchEvent.identifier];
        
        intersects = this.intersect(event, items, touchData, touchEvent);
        if(intersects.length)
        {
            for(j = intersects.length - 1; j >= 0; j--)
            {
                intersect = intersects[j];
                if (intersect.object.__touchData && intersect.object.__touchData[touchEvent.identifier])
                {
                    this.dispatch('touchmove', intersect.object, intersect, intersect.object.__touchData[touchEvent.identifier]);
                }
            }
        }
    }
};

THREE.InteractionManager.prototype.onTouchStart = function(event)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }

    var items = this.interactiveItems.touchstart;
    if(!items || !items.length)
    {
        return;
    }

    var changedTouches = event.changedTouches;
    var touchEvent;
    var touchData;
    var intersects;
    var intersect;
    var j = 0;

    for (var i = 0; i < changedTouches.length; i++)
    {
        touchEvent = changedTouches[i];
        touchData = this.pool.pop() || new THREE.InteractionData();

        this.touches[touchEvent.identifier] = touchData;
        
        intersects = this.intersect(event, items, touchData, touchEvent);

        if(intersects.length)
        {
            for(j = intersects.length - 1; j >= 0; j--)
            {
                intersect = intersects[j];
                intersect.object.__touchData = intersect.object.__touchData || {};
                intersect.object.__touchData[touchEvent.identifier] = touchData;
                intersect.object.__isDown = true;
                this.dispatch('touchstart', intersect.object, intersect, touchData);
            }
        }
    }
};

THREE.InteractionManager.prototype.onTouchEnd = function(event)
{
    if(!this.enabled)
    {
        return;
    }

    // check auto prevent
    event = event || window.event;
    if(THREE.InteractionManager.AUTO_PREVENT_DEFAULT)
    {
        event.preventDefault();
    }

    var items = this.interactiveItems.touchend;

    var changedTouches = event.changedTouches;
    var touchEvent;
    var touchData;
    var up;
    var intersects;
    var intersect;
    var j = 0;

    for (var i = 0; i < changedTouches.length; i++)
    {
        touchEvent = changedTouches[i];
        touchData = this.touches[touchEvent.identifier];
        up = false;

        if(items && items.length)
        {
            intersects = this.intersect(event, items, touchData, touchEvent);

            if(intersects.length)
            {
                for(j = intersects.length - 1; j >= 0; j--)
                {
                    intersect = intersects[j];
                    if (intersect.object.__touchData && intersect.object.__touchData[touchEvent.identifier])
                    {
                        this.dispatch('touchend', intersect.object, intersect, intersect.object.__touchData[touchEvent.identifier]);
                        intersect.object.__isDown = false;
                        intersect.object.__touchData[touchEvent.identifier] = null;
                    }
                }
            }

            for(j = items.length - 1; j >= 0; j--)
            {
                intersect = items[j];
                if(intersect.__isDown)
                {
                    if(intersect.__touchData && intersect.__touchData[touchEvent.identifier])
                    {
                        this.dispatch('touchendoutside', intersect, null, intersect.__touchData[touchEvent.identifier]);
                        intersect.__isDown = false;
                    }
                }
            }
        }
    }

    // remove the touch..
    this.pool.push(touchData);
    this.touches[touchEvent.identifier] = null;
};
