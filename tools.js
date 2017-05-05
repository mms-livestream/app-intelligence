/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

module.exports = {
  isEmpty: function(obj) {
    for(let key in obj) {
      if(obj.hasOwnProperty(key)) {
        return false;
      }
    }

    return true;
  }
};
