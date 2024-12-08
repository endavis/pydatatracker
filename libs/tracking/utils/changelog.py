# -*- coding: utf-8 -*-
# Project: bastproxy
# Filename: libs/tracking/utils/changelog.py
#
# File Description: Holds a class that monitors attributes
#
# By: Bast
"""
Holds a class that monitors attributes
"""
# Standard Library
import datetime
from uuid import uuid4
import traceback
import pprint

ignore_in_stack = []

def add_to_ignore_in_stack(list):
    ignore_in_stack.extend(list)

# 3rd Party

# Project

def fix_header(header_name):
    return header_name.replace('_', ' ').title()

class ChangeLogEntry:
    def __init__(self, item_uuid, **kwargs):
        """
        kwargs: any other info about the change
        """
        self.uuid = uuid4().hex
        self.tracked_item_uuid = item_uuid
        self.extra = kwargs
        self.header_column_width = 17
        self.created_time = datetime.datetime.now(datetime.timezone.utc)
        self.stack = self.get_stack()
        self.actor = self.find_relevant_actor(self.stack)
        self.tree = []
        for item in self.extra:
            if item == 'location':
                continue
            if not isinstance(self.extra[item], str):
                self.extra[item] = repr(self.extra[item])

    def find_relevant_actor(self, stack):
        found_actor = ''
        for line in [line for line in stack if 'File' in line]:
            if all((line.find(actor) == -1) for actor in ignore_in_stack) and 'addupdate' not in stack[stack.index(line)+1]:
                    found_actor = [line, stack[stack.index(line)+1]]
        return found_actor

    def get_stack(self):
        stack = traceback.format_stack()
        new_stack = []
        # don't need the last 2 lines
        for line in stack:
            new_stack.extend(line.splitlines() if line else [])
        return new_stack[:-2]

    def __repr__(self) -> str:
        return f"ChangeLogEntry: {self.created_time} {self.tracked_item_uuid} {self.extra}"

    def __eq__(self, value: object) -> bool:
        return self.uuid == value.uuid if isinstance(value, ChangeLogEntry) else False

    def __lt__(self, value: object) -> bool:
        return self.created_time < value.created_time if hasattr(value, 'created_time') else False # type: ignore

    def copy(self, new_type, new_item_uuid):
        extra = self.extra.copy()
        extra['type'] = new_type
        new_log = ChangeLogEntry(new_item_uuid, **extra)
        new_log.created_time = self.created_time
        new_log.stack = self.stack
        new_log.actor = self.actor
        new_log.tree = self.tree
        return new_log

    def format_detailed(self, show_stack: bool = False,
                        data_lines_to_show: int = 10):
        """
        format the change record
        """
        item_order = ['created_time', 'type', 'actor', 'location', 'action', 'sub_command', 'method',
                            'passed_index', 'locked', 'value', 'data_pre_change',
                            'data_post_change', 'removed_items']

        tmsg =  [
            f"{'Change UUID':<{self.header_column_width}} : {self.uuid}",
            f"{'Object UUID':<{self.header_column_width}} : {self.tracked_item_uuid}"]

        for item in item_order:
            tmsg.extend(self.format_data(item, data_lines_to_show))


        if self.tree:
            item = self.tree[0]
            tmsg.append(f"{'Tree':<{self.header_column_width}} : {item['type']}({item['uuid']}){' ' + item["location"] if 'location' in item else ''}")
            indent = 2
            for item in self.tree[1:]:
                tmsg.append(f"{'':<{self.header_column_width}} : {' ' * indent}|-> {item['type']}({item['uuid']}){' ' + item["location"] if 'location' in item else ''}")
                indent += 4

        if self.extra:
            for item in self.extra:
                if item in item_order or item == 'tree':
                    continue

                tmsg.extend(self.format_data(item, data_lines_to_show))

        if show_stack and self.stack:
            tmsg.append(f"{'Stack':<{self.header_column_width}} :")
            tmsg.extend([f"{'':<{self.header_column_width}} {line}" for line in self.stack[-40:] if line.strip()])

        return tmsg

    def format_data(self, name, data_lines_to_show):
        data = getattr(self, name) if hasattr(self, name) else self.extra[name] if name in self.extra else '-#@$%##$'

        if data == '-#@$%##$':
            return []

        header = fix_header(name)
        try:
            testdata = eval(data)
        except Exception as e:
            testdata = data

        if testdata in [None, 'None', '']:
            return []

        testdata_string = pprint.pformat(testdata, width=80).splitlines()

        if len(testdata_string) == 1:
            return [f"{header:<{self.header_column_width}} : {testdata}"]

        tmsg = [f"{header:<{self.header_column_width}} : {testdata_string[0]}"]
        tmsg.extend(f"{'':<{self.header_column_width}} : {line}" for line in testdata_string[1:data_lines_to_show])
        if len(testdata_string) > data_lines_to_show:
            tmsg.append(f"{'':<{self.header_column_width}} : ...")
        return tmsg

    def add_to_tree(self, uuid):
        # if uuid not in self.tree:
            self.tree.insert(0, uuid)
