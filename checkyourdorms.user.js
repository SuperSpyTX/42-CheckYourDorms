// ==UserScript==
// @name         Check Your Dorms (Hours)
// @namespace    https://github.com/SuperSpyTX/42-CheckYourDorms
// @version      0.2.2 (RC2)
// @description  Check someone's intra profile to see if they're eligible to stay in the dorms, by calculating hours total per week.  It shows up Red if they have less than 38 hours, Green otherwise.
// @author       SuperSpyTX
// @match        https://profile.intra.42.fr/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.js
// @grant        none
// ==/UserScript==

window.onload = function() {
    'use strict';
    //var data = JSON.parse($("#user-locations").attr('data-location-graph'));
    var user = window._user.login;
    if (document.documentURI.indexOf("/users/") != -1) {
        user = document.documentURI.substr(document.documentURI.indexOf("/users/") + 7);
    }
    $.getJSON("/users/" + user + "/locations_stats.json", function(data) {
        if (!data || $.isEmptyObject(data)) {
            // Element doesn't exist.
            return;
        }
        var lowerSelfEsteem = false; // set it to true for full effect.
        var sortme = [];
        var eowBoundary = {};
        var objkey = {};
        var ct = 0;
        for (var a in data) {
            sortme.push({"date": a, "hours": data[a], x: 0, y: 0});
        }
        sortme.sort(function(a,b){
            return (Date.parse(b.date) - Date.parse(a.date));
        });

        // Been a month since no login.  Should be obvious.
        if (moment.duration(moment().diff(moment(sortme[0].date))).months() > 0)
        {
            // They just don't deserve statistics at this point.
            return;
        }

        // First element of the array should be attached to the last svg.
        // Then we can literally just backtrack it all.
        var size = $("#user-locations").children().size();
        var f = 0;
        for (var i = size - 1; i >= 0; i--)
        {
            var orig = $("#user-locations").children()[i];
            var element = $(orig);
            if (element.attr('data-toggle') === undefined)
            {
                continue;
            }

            if (i == size - 1)
            {
                // Today's date should be in the formatting boundary.
                eowBoundary[moment().format('YYYY-MM-DD')] = {"x": parseInt($($(element[0]).children()[0]).attr('x')), "y": parseInt($($(element[0]).children()[0]).attr('y'))};
            }

            if (sortme[f] === undefined)
                break;
            var day = parseInt($(element[0]).children()[1].innerHTML);
            if (parseInt(sortme[f].date.slice(-2)) != day)
            {
                // Not a date in the array, but it does not mean that
                // The data is wrong, we can use it to our advantage.
                // Does it match this condition?
                var condition = moment(sortme[f].date).endOf('week');
                if (condition.date() == day)
                {
                    eowBoundary[condition.format('YYYY-MM-DD')] = {"x": parseInt($($(element[0]).children()[0]).attr('x')), "y": parseInt($($(element[0]).children()[0]).attr('y'))};
                }

                continue;
            }
            objkey[sortme[f].date] = f;
            sortme[f].x = parseInt($($(element[0]).children()[0]).attr('x'));
            sortme[f++].y = parseInt($($(element[0]).children()[0]).attr('y'));
        }

        // Now let's actually start calculating dates.
        // Week by week
        window.sortme = sortme;
        window.objkey = objkey;
        size = sortme.length;
        var currDate = moment();
        var lock = 0;
        for (var g = 0; g < sortme.length; g++)
        {
            var startWeekId = objkey[currDate.startOf('week').format('YYYY-MM-DD')];
            var endWeekId = objkey[currDate.endOf('week').format('YYYY-MM-DD')];
            var pls = 0;
            if (typeof(endWeekId) == "undefined" && g === 0)
                endWeekId = 0;
            else
            {
                pls = currDate.endOf('week');
                while (typeof(endWeekId) == "undefined")
                {
                    if (lock++ > 20)
                        break;
                    pls = pls.subtract(1, 'days');
                    endWeekId = objkey[pls.format('YYYY-MM-DD')];
                }
                if (lock > 20)
                {
                    lock = 0;
                    continue;
                }
                lock = 0;
            }
            pls = currDate.startOf('week');
            while (typeof(startWeekId) == "undefined")
            {
                if (lock++ > 20)
                    break;
                pls = pls.add(1, 'days');
                startWeekId = objkey[pls.format('YYYY-MM-DD')];
            }
            if (lock > 20)
            {
                lock = 0;
                continue;
            }
            lock = 0;

            if (( moment().week() - moment(sortme[startWeekId].date).week()) > 8)
                continue;

            // Calculate hours.
            var hours = 0;
            var minutes = 0;
            for (var id = endWeekId; id <= startWeekId; id++)
            {
                var m = moment(sortme[id].hours, "HH:mm:ss");
                var hCt = m.hours();
                var mCt = m.minutes();

                // If the hours are bugged.. skip them, they do not contribute value.
                // Also this fixes "Wrong data sent.  Contact your pedagogic team."
                if (sortme[id].hours == "23:59:59" || hCt > 23 || isNaN(hCt + hours))
                    continue;

                hours += hCt;
                minutes += mCt;
            }

            // Add the fix from issue #1
            hours += Math.round(minutes / 60);

            var x = sortme[endWeekId].x;
            var y = sortme[endWeekId].y;
            if (eowBoundary[currDate.endOf('week').format('YYYY-MM-DD')])
            {
                x = eowBoundary[currDate.endOf('week').format('YYYY-MM-DD')].x;
                y = eowBoundary[currDate.endOf('week').format('YYYY-MM-DD')].y;
            }
            //else if (endWeekId === 0 && eowBoundary[moment().format('YYYY-MM-DD')])
            //{
            //    x = eowBoundary[moment().format('YYYY-MM-DD')].x;
            //    y = eowBoundary[moment().format('YYYY-MM-DD')].y;
            //}

            var color = "#00aa00";
            if (hours < 38)
            {
                color = "#aa0000";

                // I tried to do some sort of gradient thing.
                // If you want to give it a shot, go for it.
                // But I like the standard colors better.
                if (hours > 30) {
                    var n1 = (170 * (hours / 38));
                    var n2 = 170 - 170 * (hours / 38);
                    if (n1 < 16)
                        n1 = "0" + parseInt(n1).toString(16);
                    else
                        n1 = parseInt(n1).toString(16);
                    if (n2 < 16)
                        n2 = "0" + parseInt(n2).toString(16);
                    else
                        n2 = parseInt(n2).toString(16);
                    if (n2 - 170 > 10)
                        n1 = "00";
                    if (hours < 38)
                    {
                        n1 = (parseInt(n1, 16) - 50).toString(16);
                        // n2 = (parseInt(n2, 16) + Math.round(parseInt(n2, 16) / 2)).toString(16);
                    }
                    color = "#" + n2 + n1 + "00";
                }
            } else if (hours > 99) {
                // Congratulations, you get a cookie.
                color = "#00aaaa";
            } else if (hours > 160) {
                // at this point, they are a cheater.
                color = "#aa0000";
            }
            var grp = document.createElementNS("http://www.w3.org/2000/svg", 'g');
            var circle = $(document.createElementNS("http://www.w3.org/2000/svg", 'circle'));
            circle.attr('fill', color);
            circle.attr('debug-hours', hours);
            circle.attr('cx', parseInt(x + 26));
            circle.attr('cy', parseInt(y + 8));
            circle.attr('r', 5);
            $(grp).attr('data-toggle', 'tooltip');
            $(grp).attr('data-original-title', (hours === 0 ? "No hours" : hours + " hour" + (hours != 1 && hours < 100 ? "s" : hours > 99 ? "s! 🍪" : "")));
            $(grp).append(circle);
            $(grp).tooltip({container: 'body'});
            $("#user-locations").append(grp);
            currDate = moment(currDate.startOf('week').subtract(1, 'days'));
        }
    });
};
